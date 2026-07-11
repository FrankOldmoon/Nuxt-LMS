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
// markdownToTiptap 由 lms 模块的 addImportsDir('./utils') 自动注入，无需显式导入
import { buildDocumentPrompt } from './prompt.js'

const props = defineProps({
    // umo-editor 实例（父组件传入 editorRef 解包后的值，调用 useEditor() 得到 TipTap 编辑器）
    editor: { type: Object, default: null },
    // 编辑器是否只读（被他人锁定时隐藏 AI 按钮）
    readonly: { type: Boolean, default: false },
    // 是否允许 AI 生成时插入 question 题目块（仅 showInsert 时为 true）
    canInsertQuestion: { type: Boolean, default: false },
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
let applyTimer = null
// 流式插入范围追踪：在光标处插入，后续用新累积内容替换该范围（避免重复插入）
let insertStart = null
let insertEnd = null
const APPLY_INTERVAL = 120 // ms，时间节流减少 insertContent 高频调用

// 获取 TipTap 编辑器实例
function getEditor() {
    return props.editor?.useEditor?.() || null
}

// 把当前 mdContent 实时写入编辑器：先用 markdownToTiptap 转成 TipTap JSON 节点，
// 再在光标处插入；后续用完整累积内容替换该范围（避免重复插入）
function applyToEditor() {
    const editor = getEditor()
    if (!editor) return
    if (!mdContent.value) return
    try {
        // markdown → TipTap JSON（含 ```question 围栏 → vue 节点的解析）
        const tiptapDoc = markdownToTiptap(mdContent.value)
        const nodes = tiptapDoc.content || []
        if (!nodes.length) return
        if (insertStart === null) {
            // 首次：记录光标位置，插入内容，记录结束位置
            const start = editor.state.selection.from
            editor.chain().focus()
                .insertContent(nodes)
                .run()
            insertStart = start
            insertEnd = editor.state.selection.from
        } else {
            // 后续：删除上次插入范围，重新插入完整累积内容（保证 markdown 整体正确渲染）
            editor.chain().focus()
                .deleteRange({ from: insertStart, to: insertEnd })
                .insertContent(nodes)
                .run()
            insertEnd = editor.state.selection.from
        }
    } catch (e) {
        // 失败则重置范围追踪，下次重新从光标插入，避免位置错乱
        insertStart = null
        insertEnd = null
    }
}

// 时间节流：合并短时间内的多个 SSE chunk，减少 insertContent 调用频率
function scheduleApply() {
    if (applyTimer != null) return
    applyTimer = setTimeout(() => {
        applyTimer = null
        applyToEditor()
    }, APPLY_INTERVAL)
}

// 同步刷新最后一次写入（流结束前调用，确保编辑器显示完整内容）
function flushApply() {
    if (applyTimer != null) { clearTimeout(applyTimer); applyTimer = null }
    applyToEditor()
}

// 触发文档自动保存（调用 umo-editor 的 saveContent，走 onSave 流程）
async function triggerSave() {
    try {
        await props.editor?.saveContent?.(true)
    } catch (e) {
        // 保存失败不阻塞
    }
}

// 把编辑器中所有内联（content 为对象）的 question 节点保存到 API，
// 拿到 cid 后把 content 替换为 cid 字符串（变为 DB 题目，支持提交记录）。
// 在流式生成结束后调用：题目已作为内联对象渲染，此处统一落库并替换引用。
async function saveInlineQuestions() {
    const editor = getEditor()
    if (!editor) return
    const courseId = useLmsContext().courseId.value
    if (!courseId) return

    // 收集所有内联 question 节点（content 为 JSON 对象）及其位置
    const targets = []
    editor.state.doc.descendants((node, pos) => {
        if (
            node.type.name === 'vue' &&
            node.attrs.type === 'question' &&
            node.attrs.content != null &&
            typeof node.attrs.content === 'object' &&
            !Array.isArray(node.attrs.content)
        ) {
            targets.push({ pos, obj: node.attrs.content })
        }
    })
    if (!targets.length) return

    // 串行保存每道题到 /api/questions/add（白名单字段，避免多余字段写入 DB）
    // 必须串行：/api/questions/add 通过 SELECT max(cid)+1 生成新 cid，
    // 并行保存会让多个请求读到相同 max(cid)，导致主键 (courseId, cid) 冲突，
    // 只有第一个 INSERT 成功，其余被 catch 吞成“新增失败”。
    const results = []
    for (const { obj } of targets) {
        const body = {
            course_id: courseId,
            name: obj.name ?? 'question',
            content: obj.content ?? '',
            options: obj.options ?? [],
            answer: obj.answer ?? [],
            point: obj.point ?? 1,
            type: obj.type ?? 'single',
            tags: obj.tags ?? [],
            extra: obj.extra ?? null,
            explanation: obj.explanation ?? '',
        }
        try {
            const res = await cRequest('/api/questions/add', { method: 'POST', body })
            results.push(res?.cid ?? null)
        } catch (e) {
            results.push(null)
        }
    }

    // 单次事务替换成功保存的节点 content → cid 字符串
    // 用指纹（JSON.stringify）校验节点内容仍与保存时一致，防止位置漂移误替换
    const tr = editor.state.tr
    let saved = 0
    let failed = 0
    targets.forEach(({ pos, obj }, idx) => {
        const cid = results[idx]
        if (!cid) { failed++; return }
        const node = tr.doc.nodeAt(pos)
        if (
            node &&
            node.type.name === 'vue' &&
            node.attrs.type === 'question' &&
            typeof node.attrs.content === 'object' &&
            JSON.stringify(node.attrs.content) === JSON.stringify(obj)
        ) {
            tr.setNodeMarkup(pos, undefined, { type: 'question', content: String(cid) })
            saved++
        } else {
            failed++
        }
    })
    if (saved > 0) {
        editor.view.dispatch(tr)
    }
    if (saved > 0 || failed > 0) {
        toast.add({
            title: failed > 0
                ? t('ueditor.aiFloat.questionSavedSome', { saved, failed })
                : t('ueditor.aiFloat.questionSaved', { saved }),
            color: failed > 0 ? 'warning' : 'success',
        })
    }
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
    // 重置插入范围追踪（每次生成独立追踪光标位置）
    insertStart = null
    insertEnd = null

    abortController = new AbortController()

    try {
        const messages = [
            {
                role: 'system',
                content: buildDocumentPrompt(props.canInsertQuestion),
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

        // 流结束
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
        // 全部结束后：确保最后内容已写入编辑器，
        // 再把内联题目落库并替换为 cid 引用，最后触发文档自动保存
        flushApply()
        generating.value = false
        abortController = null
        if (mdContent.value) {
            await saveInlineQuestions()
            await triggerSave()
        }
    }
}

function onStop() {
    if (abortController) abortController.abort()
}

onBeforeUnmount(() => {
    if (abortController) abortController.abort()
    if (applyTimer != null) clearTimeout(applyTimer)
})
</script>
