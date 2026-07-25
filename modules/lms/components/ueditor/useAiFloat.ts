import { ref, computed, onBeforeUnmount } from 'vue'
import { buildDocumentPrompt } from './prompt.js'

export interface AiFloatProps {
    editor: any
    readonly: boolean
    canInsertQuestion: boolean
}

export function useAiFloat(props: AiFloatProps) {
    const { t } = useI18n()
    const { hasRole } = useAuth()
    const toast = useToast()

    const visible = computed(() => (hasRole('admin') || hasRole('teacher')) && !props.readonly)

    const open = ref(false)
    const prompt = ref('')
    const generating = ref(false)
    const done = ref(false)
    const stopped = ref(false)
    const genError = ref('')
    const mdContent = ref('')

    let abortController: AbortController | null = null
    let applyTimer: ReturnType<typeof setTimeout> | null = null
    let insertStart: number | null = null
    let insertEnd: number | null = null
    const APPLY_INTERVAL = 120

    function getEditor() {
        return props.editor?.useEditor?.() || null
    }

    function applyToEditor() {
        const editor = getEditor()
        if (!editor || !mdContent.value) return
        try {
            const tiptapDoc = markdownToTiptap(mdContent.value)
            const nodes = tiptapDoc.content || []
            if (!nodes.length) return
            if (insertStart === null) {
                const start = editor.state.selection.from
                editor.chain().focus().insertContent(nodes).run()
                insertStart = start
                insertEnd = editor.state.selection.from
            } else {
                editor.chain().focus()
                    .deleteRange({ from: insertStart, to: insertEnd })
                    .insertContent(nodes).run()
                insertEnd = editor.state.selection.from
            }
        } catch {
            insertStart = null
            insertEnd = null
        }
    }

    function scheduleApply() {
        if (applyTimer != null) return
        applyTimer = setTimeout(() => { applyTimer = null; applyToEditor() }, APPLY_INTERVAL)
    }

    function flushApply() {
        if (applyTimer != null) { clearTimeout(applyTimer); applyTimer = null }
        applyToEditor()
    }

    async function triggerSave() {
        try { await props.editor?.saveContent?.(true) } catch { /* noop */ }
    }

    async function saveInlineQuestions() {
        const editor = getEditor()
        if (!editor) return
        const courseId = useLmsContext().courseId.value
        if (!courseId) return

        const targets: { pos: number; obj: any }[] = []
        editor.state.doc.descendants((node: any, pos: number) => {
            if (
                node.type.name === 'vue' && node.attrs.type === 'question' &&
                node.attrs.content != null && typeof node.attrs.content === 'object' && !Array.isArray(node.attrs.content)
            ) { targets.push({ pos, obj: node.attrs.content }) }
        })
        if (!targets.length) return

        const results: (number | null)[] = []
        for (const { obj } of targets) {
            const body = {
                course_id: courseId,
                name: obj.name ?? 'question', content: obj.content ?? '',
                options: obj.options ?? [], answer: obj.answer ?? [],
                point: obj.point ?? 1, type: obj.type ?? 'single',
                tags: obj.tags ?? [], extra: obj.extra ?? null, explanation: obj.explanation ?? '',
            }
            try { const res = await cRequest('/api/questions/add', { method: 'POST', body }); results.push(res?.cid ?? null) }
            catch { results.push(null) }
        }

        const tr = editor.state.tr
        let saved = 0, failed = 0
        targets.forEach(({ pos, obj }, idx) => {
            const cid = results[idx]
            if (!cid) { failed++; return }
            const node = tr.doc.nodeAt(pos)
            if (node && node.type.name === 'vue' && node.attrs.type === 'question' &&
                typeof node.attrs.content === 'object' && JSON.stringify(node.attrs.content) === JSON.stringify(obj)) {
                tr.setNodeMarkup(pos, undefined, { type: 'question', content: String(cid) })
                saved++
            } else { failed++ }
        })
        if (saved > 0) editor.view.dispatch(tr)
        if (saved > 0 || failed > 0) {
            toast.add({
                title: failed > 0 ? t('ueditor.aiFloat.questionSavedSome', { saved, failed }) : t('ueditor.aiFloat.questionSaved', { saved }),
                color: failed > 0 ? 'warning' : 'success',
            })
        }
    }

    function openPanel() { open.value = true }

    function closePanel() {
        if (generating.value) onStop()
        open.value = false
    }

    async function onGenerate() {
        const text = prompt.value.trim()
        if (!text || generating.value) return
        if (!getEditor()) { toast.add({ title: t('ueditor.aiFloat.editorNotReady'), color: 'error' }); return }

        generating.value = true
        done.value = false
        stopped.value = false
        genError.value = ''
        mdContent.value = ''
        insertStart = null
        insertEnd = null
        abortController = new AbortController()

        try {
            const messages = [
                { role: 'system', content: buildDocumentPrompt(props.canInsertQuestion) },
                { role: 'user', content: text },
            ]
            const resp = await fetch('/api/aichat/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages, thinking: false }),
                signal: abortController.signal,
            })

            const contentType = resp.headers.get('Content-Type') || ''
            if (!contentType.includes('text/event-stream')) {
                let msg = t('ueditor.aiFloat.failed')
                try { const data = await resp.json(); msg = data.msg || msg } catch { /* noop */ }
                throw new Error(msg)
            }

            const reader = resp.body!.getReader()
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
                        if (delta) { mdContent.value += delta; scheduleApply() }
                    } catch { /* skip malformed chunk */ }
                }
            }

            done.value = true
            toast.add({ title: t('ueditor.aiFloat.done'), color: 'success' })
        } catch (err: any) {
            if (err?.name === 'AbortError') {
                stopped.value = true
                done.value = true
            } else {
                genError.value = err?.message || t('ueditor.aiFloat.failed')
                done.value = true
            }
        } finally {
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

    return { visible, open, prompt, generating, done, stopped, genError, openPanel, closePanel, onGenerate, onStop }
}
