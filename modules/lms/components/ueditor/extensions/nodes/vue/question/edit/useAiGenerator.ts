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
    // accumulate originalStartstreamingText（include ```json fence），outputtoParent ComponentFrontthenuse stripFences strip
    const streamText = ref('')

    let abortController = null
    let rafId = null

    function buildSystemPrompt(type: string) {
        const typePrompt = promptFor(type) || ''
        return `You are a professional question-generation expert. Generate exactly ONE question of the type specified below, strictly following its structure, generation rules, and output format.

${typePrompt}`
    }

    /**
     * strip markdown Code Blockmark（```json / ```），onlykeep pure JSON Content。
     * streaming periodbetweenreal-time outputtoParent Component JSON Monaco —— not put fenced intoEditeditor。
     */
    function stripFences(raw: string) {
        let s = raw || ''
        // removeOnHead ```json or ``` mark
        const openMatch = s.match(/^\s*```(?:json)?\s*\n?/)
        if (openMatch) s = s.slice(openMatch[0].length)
        // remove endTail ``` mark（streaming periodbetweencancannot yettoarrive）
        s = s.replace(/\n?\s*```\s*$/, '')
        return s
    }

    // use rAF combinedandsameone frameInsideManyitems SSE chunk，subtractFewParent Component jsonText / Monaco HighfrequentRefresh
    function scheduleStreamEmit() {
        if (rafId != null) return
        rafId = requestAnimationFrame(() => {
            rafId = null
            emit('streamText', stripFences(streamText.value))
        })
    }

    // SyncRefreshmostBackonetimesoutput（ensureFather Monaco Showcomplete JSON），useinstreamEndFront
    function flushStreamEmit() {
        if (rafId != null) { cancelAnimationFrame(rafId); rafId = null }
        emit('streamText', stripFences(streamText.value))
    }

    async function onGenerate() {
        const text = scope.value.trim()
        if (!text || generating.value) return

        // CapturelocaltimesGeneratequestion type when，avoid streaming periodbetweenUserSwitchquestion type changes causing result mismatch
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

            // non-streamingResponse = outWrong（cResp Return JSON）
            const content type = resp.headers.get('Content-Type') || ''
            if (!content type.includes('text/event-stream')) {
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

            // streamEnd：firstSyncRefreshmostBackonetimesoutput（ensureFather Monaco Showcomplete JSON），thenAnalysisandApplication
            flushStreamEmit()
            const question = parseQuestionJson(streamText.value, genType)
            emit('generated', question)
            done.value = true
            toast.add({ title: t('question.aiGenerateDone'), color: 'success' })
        } catch (err) {
            if (err?.name === 'AbortError') {
                // UseractivelyStop
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
     * Analysis LLM Return JSON Question，allowWrongHandle（go to markdown mark、extract JSON、completeField）
     * note：noSettings record / correct_rate，by Parent Componentpreserve originalHasRecordsField
     */
    function parseQuestionJson(text: string, expectedType: string) {
        let cleaned = (text || '').trim()
        // remove markdown Code Blockmark
        if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '')
        }
        // extractFirstitems { tomostBackoneitems } betweenContent
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
        // force question typeCurrentquestion type
        q.type = expectedType
        // fill coreField（not change record，preserveparent formalreadyHasRecords）
        if (!Array.isArray(q.options)) q.options = []
        if (!Array.isArray(q.answer)) q.answer = []
        if (!Array.isArray(q.tags)) q.tags = []
        if (q.point == null) q.point = 1
        if (q.name == null) q.name = ''
        if (q.content == null) q.content = ''
        if (q.explanation == null) q.explanation = ''
        return q
    }

    // question typeSwitchwhenClearlocalComponentStatus（jsonText by Parent Componentfollow form changeAutoUpdate）
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
