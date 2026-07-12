import { ref, watch, onBeforeUnmount } from 'vue'
import { promptFor } from './prompts.js'

export function useAiGenerator(props: { type: string }, emit: (event: string, ...args: any[]) => void) {
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

    function buildSystemPrompt(type: string) {
        const typePrompt = promptFor(type) || ''
        return `You are a professional question-generation expert. Generate exactly ONE question of the type specified below, strictly following its structure, generation rules, and output format.

${typePrompt}`
    }

    /**
     * 剥离 markdown 代码块标记（```json / ```），只保留纯 JSON 内容。
     * 流式期间实时输出到父组件的 JSON Monaco —— 不把围栏放进编辑器。
     */
    function stripFences(raw: string) {
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
    function parseQuestionJson(text: string, expectedType: string) {
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

    return {
        scope,
        generating,
        done,
        stopped,
        genError,
        onGenerate,
        onStop,
    }
}
