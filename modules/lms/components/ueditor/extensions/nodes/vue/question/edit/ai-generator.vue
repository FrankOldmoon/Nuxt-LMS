<template>
    <div class="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-2">
        <!-- 标题 -->
        <div class="flex items-center gap-2">
            <UIcon name="i-lucide-sparkles" class="size-4 text-purple-500" />
            <span class="text-xs font-medium text-gray-700 dark:text-gray-300">
                {{ $t('question.aiGenerateTitle') }}
            </span>
            <span class="text-xs text-gray-400">— {{ $t('question.aiGenerateHint') }}</span>
        </div>

        <!-- 知识范围输入 + 生成按钮 -->
        <div class="flex gap-2">
            <UInput
                v-model="scope"
                :placeholder="$t('question.aiGenerateScopePlaceholder')"
                size="sm"
                class="flex-1"
                :disabled="generating"
                @keydown.enter="onGenerate"
            />
            <UButton
                icon="i-lucide-sparkles"
                color="primary"
                size="sm"
                :loading="generating"
                :disabled="generating"
                @click="onGenerate"
            >
                {{ $t('question.aiGenerateBtn') }}
            </UButton>
            <UButton
                v-if="generating"
                icon="i-lucide-square"
                color="error"
                variant="soft"
                size="sm"
                @click="onStop"
            >
                {{ $t('common.stop') }}
            </UButton>
        </div>

        <!-- 状态行（流式输出实时显示在父组件的 JSON Monaco 中） -->
        <div v-if="generating || done" class="flex items-center gap-1 text-xs text-gray-500">
            <UIcon v-if="generating" name="i-lucide-loader-2" class="animate-spin size-3.5" />
            <UIcon v-else-if="genError" name="i-lucide-alert-circle" class="size-3.5 text-red-500" />
            <UIcon v-else-if="stopped" name="i-lucide-square" class="size-3.5 text-gray-400" />
            <UIcon v-else name="i-lucide-check-circle" class="size-3.5 text-green-500" />
            <span>{{ generating ? $t('question.aiGenerateStreaming') : (genError ? $t('question.aiGenerateFailed') : (stopped ? $t('question.aiGenerateStopped') : $t('question.aiGenerateDone'))) }}</span>
        </div>

        <!-- 错误提示 -->
        <div v-if="genError" class="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
            <UIcon name="i-lucide-alert-circle" class="shrink-0 mt-0.5" />
            <span class="flex-1">{{ genError }}</span>
        </div>
    </div>
</template>

<script setup>
import { promptFor } from './prompts.js'

const props = defineProps({
    // 当前题型（用于选取对应 prompt 与解析校验）
    type: { type: String, required: true },
})
// streaming: 流式状态（开始/结束）  streamText: 剥离围栏后的纯 JSON 片段  generated: 解析完成的题目对象
const emit = defineEmits(['streaming', 'streamText', 'generated'])

const { t } = useI18n()
const toast = useToast()

const scope = ref('')
const generating = ref(false)
const done = ref(false)
const stopped = ref(false)
const genError = ref('')
// 累积原始流式文本（含 ```json 围栏），输出给父组件前再用 stripFences 剥离
const streamText = ref('')

let abortController = null
let rafId = null

function buildSystemPrompt(type) {
    const typePrompt = promptFor(type) || ''
    return `You are a professional question-generation expert. Generate exactly ONE question of the type specified below, strictly following its structure, generation rules, and output format.

${typePrompt}`
}

/**
 * 剥离 markdown 代码块标记（```json / ```），只保留纯 JSON 内容。
 * 流式期间实时输出到父组件的 JSON Monaco —— 不把围栏放进编辑器。
 */
function stripFences(raw) {
    let s = raw || ''
    // 去除开头的 ```json 或 ``` 标记
    const openMatch = s.match(/^\s*```(?:json)?\s*\n?/)
    if (openMatch) s = s.slice(openMatch[0].length)
    // 去除结尾的 ``` 标记（流式期间可能尚未到达）
    s = s.replace(/\n?\s*```\s*$/, '')
    return s
}

// 用 rAF 合并同一帧内的多个 SSE chunk，减少父组件 jsonText / Monaco 的高频刷新
function scheduleStreamEmit() {
    if (rafId != null) return
    rafId = requestAnimationFrame(() => {
        rafId = null
        emit('streamText', stripFences(streamText.value))
    })
}

// 同步刷新最后一次输出（确保父 Monaco 显示完整 JSON），用于流结束前
function flushStreamEmit() {
    if (rafId != null) { cancelAnimationFrame(rafId); rafId = null }
    emit('streamText', stripFences(streamText.value))
}

async function onGenerate() {
    const text = scope.value.trim()
    if (!text || generating.value) return

    // 捕获本次生成时的题型，避免流式期间用户切换题型导致结果不匹配
    const genType = props.type

    generating.value = true
    done.value = false
    stopped.value = false
    genError.value = ''
    streamText.value = ''
    emit('streaming', true)

    abortController = new AbortController()

    try {
        const messages = [
            { role: 'system', content: buildSystemPrompt(genType) },
            { role: 'user', content: `Knowledge scope: ${text}\n\nPlease generate one "${genType}" question within this knowledge scope. Return ONLY a single \`\`\`json code block.` },
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
            let msg = t('question.aiGenerateFailed')
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
                        streamText.value += delta
                        scheduleStreamEmit()
                    }
                } catch { /* skip malformed chunk */ }
            }
        }

        // 流结束：先同步刷新最后一次输出（确保父 Monaco 显示完整 JSON），再解析并应用
        flushStreamEmit()
        const question = parseQuestionJson(streamText.value, genType)
        emit('generated', question)
        done.value = true
        toast.add({ title: t('question.aiGenerateDone'), color: 'success' })
    } catch (err) {
        if (err?.name === 'AbortError') {
            // 用户主动停止
            stopped.value = true
            done.value = true
        } else {
            genError.value = err?.message || t('question.aiGenerateFailed')
            done.value = true
        }
    } finally {
        generating.value = false
        emit('streaming', false)
        abortController = null
    }
}

function onStop() {
    if (abortController) abortController.abort()
}

/**
 * 解析 LLM 返回的 JSON 题目，容错处理（去 markdown 标记、提取 JSON、补全字段）
 * 注意：不设置 record / correct_rate，由父组件保留原有记录字段
 */
function parseQuestionJson(text, expectedType) {
    let cleaned = (text || '').trim()
    // 去除 markdown 代码块标记
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '')
    }
    // 提取第一个 { 到最后一个 } 之间的内容
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start !== -1 && end !== -1 && end > start) {
        cleaned = cleaned.slice(start, end + 1)
    }
    let q
    try {
        q = JSON.parse(cleaned)
    } catch (e) {
        throw new Error(t('question.aiGenerateFailed') + ': ' + (e?.message || 'invalid JSON'))
    }
    // 强制题型为当前题型
    q.type = expectedType
    // 补全核心字段（不动 record，保留父表单已有记录）
    if (!Array.isArray(q.options)) q.options = []
    if (!Array.isArray(q.answer)) q.answer = []
    if (!Array.isArray(q.tags)) q.tags = []
    if (q.point == null) q.point = 1
    if (q.name == null) q.name = ''
    if (q.content == null) q.content = ''
    if (q.explanation == null) q.explanation = ''
    return q
}

// 题型切换时清空本组件状态（jsonText 由父组件随 form 变化自动更新）
watch(() => props.type, () => {
    if (generating.value) return
    done.value = false
    stopped.value = false
    genError.value = ''
    streamText.value = ''
})

onBeforeUnmount(() => {
    if (abortController) abortController.abort()
    if (rafId != null) cancelAnimationFrame(rafId)
})
</script>
