<template>
    <!-- 仅 teacher 以上角色且编辑器非只读时显示 -->
    <div v-if="visible" class="fixed bottom-14 right-6 z-50 print:hidden">
        <!-- 收起态：悬浮按钮 -->
        <UButton
            v-if="!open"
            icon="i-lucide-sparkles"
            color="primary"
            size="lg"
            class="shadow-lg rounded-full"
            :title="$t('ueditor.aiFloat.title')"
            :aria-label="$t('ueditor.aiFloat.title')"
            @click="openPanel"
        />

        <!-- 展开态：提示词输入面板 -->
        <div v-else class="bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3 w-80 max-w-[calc(100vw-3rem)] space-y-2">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-sparkles" class="size-4 text-purple-500" />
                    <span class="text-sm font-medium">{{ $t('ueditor.aiFloat.title') }}</span>
                </div>
                <UButton icon="i-lucide-x" size="2xs" variant="ghost" :aria-label="$t('common.close')" @click="closePanel" />
            </div>
            <p class="text-xs text-gray-400">{{ $t('ueditor.aiFloat.hint') }}</p>
            <UTextarea
            class="w-full"
                v-model="prompt"
                :placeholder="$t('ueditor.aiFloat.placeholder')"
                :rows="4"
                :disabled="generating"
                autofocus
            />
            <div class="flex items-center gap-2 flex-wrap">
                <UButton
                    v-if="!generating"
                    icon="i-lucide-sparkles"
                    color="primary"
                    size="sm"
                    :disabled="!prompt.trim()"
                    @click="onGenerate"
                >
                    {{ $t('ueditor.aiFloat.generate') }}
                </UButton>
                <UButton
                    v-else
                    icon="i-lucide-square"
                    color="error"
                    variant="soft"
                    size="sm"
                    @click="onStop"
                >
                    {{ $t('common.stop') }}
                </UButton>
                <span v-if="generating" class="text-xs text-gray-500 flex items-center gap-1">
                    <UIcon name="i-lucide-loader-2" class="animate-spin size-3.5" />
                    {{ $t('ueditor.aiFloat.streaming') }}
                </span>
                <span v-else-if="stopped" class="text-xs text-gray-400">{{ $t('ueditor.aiFloat.stopped') }}</span>
                <span v-else-if="done" class="text-xs text-green-500 flex items-center gap-1">
                    <UIcon name="i-lucide-check-circle" class="size-3.5" />
                    {{ $t('ueditor.aiFloat.done') }}
                </span>
            </div>
            <div v-if="genError" class="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded text-xs text-red-700 dark:text-red-300">
                {{ genError }}
            </div>
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    // umo-editor 实例（父组件传入 editorRef 解包后的值，调用 useEditor() 得到 TipTap 编辑器）
    editor: { type: Object, default: null },
    // 编辑器是否只读（被他人锁定时隐藏 AI 按钮）
    readonly: { type: Boolean, default: false },
})

const { t } = useI18n()
const { hasRole } = useAuth()
const toast = useToast()

// 仅 teacher/admin 且编辑器可写时显示
const visible = computed(() => (hasRole('admin') || hasRole('teacher')) && !props.readonly)

const open = ref(false)
const prompt = ref('')
const generating = ref(false)
const done = ref(false)
const stopped = ref(false)
const genError = ref('')
// 累积的 markdown 内容（流式期间逐步增长，实时写入编辑器）
const mdContent = ref('')

let abortController = null
let rafId = null

// 获取 TipTap 编辑器实例
function getEditor() {
    return props.editor?.useEditor?.() || null
}

// 把当前 mdContent 实时写入编辑器（setContent 为替换模式：用生成内容覆盖编辑器）
function applyToEditor() {
    const editor = getEditor()
    if (!editor) return
    try {
        editor.commands.setContent(mdContent.value, { contentType: 'markdown' })
    } catch (e) {
        // 编辑器状态异常时忽略，避免中断流式输出
    }
}

// rAF 节流：合并同一帧内的多个 SSE chunk，减少 setContent 高频调用
function scheduleApply() {
    if (rafId != null) return
    rafId = requestAnimationFrame(() => {
        rafId = null
        applyToEditor()
    })
}

// 同步刷新最后一次写入（流结束前调用，确保编辑器显示完整内容）
function flushApply() {
    if (rafId != null) { cancelAnimationFrame(rafId); rafId = null }
    applyToEditor()
}

function openPanel() {
    open.value = true
}

function closePanel() {
    if (generating.value) onStop()
    open.value = false
}

async function onGenerate() {
    const text = prompt.value.trim()
    if (!text || generating.value) return

    // 编辑器未就绪则提示（umo-editor 通常在 onCreated 后才可用）
    if (!getEditor()) {
        toast.add({ title: t('ueditor.aiFloat.editorNotReady'), color: 'error' })
        return
    }

    generating.value = true
    done.value = false
    stopped.value = false
    genError.value = ''
    mdContent.value = ''

    abortController = new AbortController()

    try {
        const messages = [
            {
                role: 'system',
                content: 'You are a helpful assistant that generates markdown content for an educational document. Return ONLY markdown content. Do not wrap the entire response in a code fence.',
            },
            { role: 'user', content: text },
        ]

        const resp = await fetch('/api/aichat/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages, thinking: false }),
            signal: abortController.signal,
        })

        // 非流式响应 = 出错（cResp 返回 JSON）
        const contentType = resp.headers.get('Content-Type') || ''
        if (!contentType.includes('text/event-stream')) {
            let msg = t('ueditor.aiFloat.failed')
            try {
                const data = await resp.json()
                msg = data.msg || msg
            } catch { /* noop */ }
            throw new Error(msg)
        }

        const reader = resp.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
            const { done: rd, value } = await reader.read()
            if (rd) break
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''
            for (const line of lines) {
                const trimmed = line.trim()
                if (!trimmed.startsWith('data:')) continue
                const data = trimmed.slice(5).trim()
                if (data === '[DONE]') continue
                try {
                    const parsed = JSON.parse(data)
                    const delta = parsed.choices?.[0]?.delta?.content || ''
                    if (delta) {
                        mdContent.value += delta
                        scheduleApply()
                    }
                } catch { /* skip malformed chunk */ }
            }
        }

        // 流结束：同步刷新最后一次写入，确保编辑器显示完整内容
        flushApply()
        done.value = true
        toast.add({ title: t('ueditor.aiFloat.done'), color: 'success' })
    } catch (err) {
        if (err?.name === 'AbortError') {
            // 用户主动停止
            stopped.value = true
            done.value = true
        } else {
            genError.value = err?.message || t('ueditor.aiFloat.failed')
            done.value = true
        }
    } finally {
        generating.value = false
        abortController = null
    }
}

function onStop() {
    if (abortController) abortController.abort()
}

onBeforeUnmount(() => {
    if (abortController) abortController.abort()
    if (rafId != null) cancelAnimationFrame(rafId)
})
</script>
