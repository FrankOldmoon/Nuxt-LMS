import { ref, computed, provide, watch, nextTick, type InjectionKey } from 'vue'
import SingleEditor from './edit/single.vue'
import JudgeEditor from './edit/judge.vue'
import MultipleEditor from './edit/multiple.vue'
import FillEditor from './edit/fill.vue'
import SelectEditor from './edit/select.vue'
import SortEditor from './edit/sort.vue'
import ClassifyEditor from './edit/classify.vue'
import PuzzleEditor from './edit/puzzle.vue'
import HtmlEditor from './edit/html.vue'
import ShortAnswerEditor from './edit/short-answer.vue'
import MatchEditor from './edit/match.vue'
import CompositeEditor from './edit/composite.vue'
import VideoEditor from './edit/video.vue'
import EvaluationEditor from './edit/evaluation.vue'
import OjEditor from './edit/oj.vue'
import AiGenerator from './edit/ai-generator.vue'
import { promptFor } from './edit/prompts.js'

export interface QuestionEditProps {
    modelValue?: boolean
    questionId?: number
    question?: any
    courseId?: number
}

export type QuestionEditEmit = (event: 'update:modelValue' | 'saved', ...args: any[]) => void

type QuestionEditCtx = ReturnType<typeof useQuestionEdit>
export const QuestionEditKey: InjectionKey<QuestionEditCtx> = Symbol('QuestionEdit')
export function useQuestionEditContext() {
    const ctx = inject(QuestionEditKey)
    if (!ctx) throw new Error('useQuestionEditContext must be used within Question edit.vue')
    return ctx
}

export function useQuestionEdit(props: QuestionEditProps, emit: QuestionEditEmit) {
    const { t } = useI18n()
    const { courseId: ctxCourseId } = useLmsContext()
    const effectiveCourseId = computed(() => props.courseId || ctxCourseId.value)
    const toast = useToast()

    const isModal = computed(() => props.modelValue !== undefined)
    const open = computed({
        get: () => props.modelValue,
        set: (v: any) => emit('update:modelValue', v),
    })

    const typeOptions = computed(() => [
        { label: t('question.typeSingle'), value: 'single' },
        { label: t('question.typeJudge'), value: 'judge' },
        { label: t('question.typeMultiple'), value: 'multiple' },
        { label: t('question.typeFill'), value: 'fill' },
        { label: t('question.typeSelect'), value: 'select' },
        { label: t('question.typeSort'), value: 'sort' },
        { label: t('question.typeClassify'), value: 'classify' },
        { label: t('question.typePuzzle'), value: 'puzzle' },
        { label: t('question.typeHtml'), value: 'html' },
        { label: t('question.typeShortAnswer'), value: 'short-answer' },
        { label: t('question.typeMatch'), value: 'match' },
        { label: t('question.typeComposite'), value: 'composite' },
        { label: t('question.typeVideo'), value: 'video' },
        { label: t('question.typeEvaluation'), value: 'evaluation' },
        { label: t('question.typeOj'), value: 'oj' },
    ])

    const componentMap: Record<string, any> = {
        single: SingleEditor, judge: JudgeEditor, multiple: MultipleEditor, fill: FillEditor,
        select: SelectEditor, sort: SortEditor, classify: ClassifyEditor, puzzle: PuzzleEditor,
        html: HtmlEditor, 'short-answer': ShortAnswerEditor, match: MatchEditor,
        composite: CompositeEditor, video: VideoEditor, evaluation: EvaluationEditor, oj: OjEditor,
    }
    const typeComponent = computed(() => componentMap[form.value?.type] || null)

    const saving = ref(false)
    const saveMsg = ref('')
    const saveOk = ref(true)
    const form = ref<any>(null)
    let originalData: any = null
    let skipPreviewSync = false
    let justSaved = false

    // ── JSON 原始数据编辑器 ──
    const showJsonEditor = ref(false)
    const jsonText = ref('')
    const jsonError = ref('')
    let syncingFromForm = false
    let syncingFromJson = false

    // ── AI 流式生成状态 ──
    const aiStreaming = ref(false)
    let aiGenSucceeded = false

    const currentTypePrompt = computed(() => {
        const tp = form.value?.type
        if (!tp) return ''
        return promptFor(tp) || ''
    })
    const hasTypePrompt = computed(() => !!promptFor(form.value?.type))

    const copyCopied = ref(false)
    let copyCopiedTimer: any = null

    async function copyCurrentPrompt() {
        const text = currentTypePrompt.value
        if (!text) return
        let ok = false
        if (navigator?.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(text)
                ok = true
            } catch {
                // 非安全上下文（非 HTTPS）或权限不足，降级到 execCommand
            }
        }
        if (!ok) {
            try {
                const ta = document.createElement('textarea')
                ta.value = text
                ta.style.position = 'fixed'
                ta.style.opacity = '0'
                document.body.appendChild(ta)
                ta.select()
                ok = document.execCommand('copy')
                document.body.removeChild(ta)
            } catch {
                ok = false
            }
        }
        if (ok) {
            copyCopied.value = true
            toast.add({ title: t('question.typePromptCopied'), color: 'success' })
            if (copyCopiedTimer) clearTimeout(copyCopiedTimer)
            copyCopiedTimer = setTimeout(() => { copyCopied.value = false }, 1500)
        } else {
            toast.add({ title: t('question.typePromptCopyFailed'), color: 'error' })
        }
    }

    // form → jsonText
    watch(form, (newForm) => {
        if (syncingFromJson) return
        if (!newForm) { jsonText.value = ''; jsonError.value = ''; return }
        syncingFromForm = true
        try {
            jsonText.value = JSON.stringify(newForm, null, 2)
            jsonError.value = ''
        } catch (e: any) {
            jsonError.value = e?.message || 'Serialize error'
        } finally {
            syncingFromForm = false
        }
    }, { deep: true, immediate: true })

    // jsonText → form
    watch(jsonText, (newText) => {
        if (syncingFromForm) return
        if (aiStreaming.value) return
        if (!form.value) return
        if (!String(newText || '').trim()) return
        try {
            const parsed = JSON.parse(newText)
            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                jsonError.value = 'JSON must be an object'
                return
            }
            syncingFromJson = true
            for (const key of Object.keys(parsed)) {
                form.value[key] = parsed[key]
            }
            jsonError.value = ''
        } catch (e: any) {
            jsonError.value = e?.message || 'Parse error'
        } finally {
            syncingFromJson = false
        }
    })

    provide('questionForm', form)

    function initForm() {
        skipPreviewSync = true
        if (!props.question) {
            form.value = {
                name: '', type: 'single', options: ['', '', '', ''], answer: [0],
                point: 1, content: '', explanation: '', tags: [], record: [],
            }
            originalData = JSON.parse(JSON.stringify(form.value))
            nextTick(() => { skipPreviewSync = false })
            return
        }
        const normalized = {
            name: props.question.name || '',
            options: props.question.options != null ? JSON.parse(JSON.stringify(props.question.options)) : [],
            type: props.question.type || 'single',
            point: Number(props.question.point) || 0,
            answer: Array.isArray(props.question.answer) ? [...props.question.answer] : [],
            explanation: props.question.explanation || '',
            tags: Array.isArray(props.question.tags) ? [...props.question.tags] : [],
            record: Array.isArray(props.question.record) ? JSON.parse(JSON.stringify(props.question.record)) : [],
            content: Array.isArray(props.question.content) ? JSON.parse(JSON.stringify(props.question.content)) : props.question.content,
            // extra：扩展字段（含 optionMarkdown 选项级 markdown 开关，缺省/true = markdown）
            extra: props.question.extra ?? null,
        }
        form.value = normalized
        originalData = JSON.parse(JSON.stringify(normalized))
        nextTick(() => { skipPreviewSync = false })
    }

    // 实时预览：form 变化时同步到 props.question
    watch(form, (newForm) => {
        if (skipPreviewSync || !newForm || !props.question) return
        const q = props.question
        q.name = newForm.name; q.type = newForm.type; q.point = newForm.point
        q.content = newForm.content; q.options = newForm.options; q.answer = newForm.answer
        q.explanation = newForm.explanation; q.tags = newForm.tags; q.extra = newForm.extra
    }, { deep: true })

    function onTypeChange() {
        if (!form.value) return
        switch (form.value.type) {
            case 'judge': form.value.options = [t('question.correct'), t('question.wrong')]; form.value.answer = [0]; break
            case 'fill': form.value.options = []; form.value.answer = []; break
            case 'single': form.value.options = ['', '', '', '']; form.value.answer = [0]; break
            case 'multiple': form.value.options = ['', '', '', '']; form.value.answer = []; break
            case 'select': form.value.options = []; form.value.answer = []; break
            case 'sort': form.value.options = ['', '', '']; form.value.answer = [0, 1, 2]; break
            case 'classify': form.value.options = [{ name: '', items: ['', ''] }, { name: '', items: ['', ''] }]; form.value.answer = [0, 0, 1, 1]; break
            case 'puzzle': form.value.options = { url: '', split: 3 }; form.value.answer = [0, 1, 2, 3, 4, 5, 6, 7, 8]; break
            case 'html': form.value.options = []; form.value.answer = [1]; form.value.content = ''; break
            case 'short-answer': form.value.options = []; form.value.answer = ['']; break
            case 'match': form.value.options = [{ left: '', right: '' }, { left: '', right: '' }]; form.value.answer = [0, 1]; break
            case 'composite': form.value.options = []; form.value.answer = []; form.value.content = []; break
            case 'video': form.value.options = { src: '', questions: [] }; form.value.answer = []; form.value.content = ''; break
            case 'evaluation': form.value.options = { goal: '', threshold: 0.8 }; form.value.answer = []; form.value.content = ''; break
            case 'oj': form.value.options = { pid: '' }; form.value.answer = []; form.value.content = ''; break
        }
    }

    function resetForm() {
        if (originalData) form.value = JSON.parse(JSON.stringify(originalData))
        saveMsg.value = ''
    }

    function onAiStreaming(v: any) { aiStreaming.value = v }
    function onAiStreamText(text: string) { jsonText.value = text }
    function onAiGenerated(q: any) {
        if (!form.value) return
        aiGenSucceeded = true
        for (const key of Object.keys(q)) form.value[key] = q[key]
        toast.add({ title: t('question.aiGenerateApplied'), color: 'success' })
    }

    watch(aiStreaming, (v) => {
        if (v) {
            showJsonEditor.value = true
            aiGenSucceeded = false
        } else if (!aiGenSucceeded && form.value) {
            syncingFromForm = true
            try {
                jsonText.value = JSON.stringify(form.value, null, 2)
                jsonError.value = ''
            } catch (e: any) {
                jsonError.value = e?.message || 'Serialize error'
            } finally {
                syncingFromForm = false
            }
        }
    })

    async function saveQuestion() {
        if (!form.value) return
        saving.value = true
        saveMsg.value = ''
        try {
            if (props.questionId) {
                await cRequest('/api/questions/update', {
                    method: 'POST',
                    body: { id: props.questionId, course_id: effectiveCourseId.value, ...form.value },
                })
                emit('saved', form.value)
            } else {
                const result = await cRequest('/api/questions/add', {
                    method: 'POST',
                    body: { course_id: effectiveCourseId.value, ...form.value },
                })
                emit('saved', { ...form.value, cid: result.cid })
            }
            saveOk.value = true
            saveMsg.value = t('question.saveSuccess')
            originalData = JSON.parse(JSON.stringify(form.value))
            if (isModal.value) { justSaved = true; open.value = false }
        } catch (err: any) {
            saveOk.value = false
            saveMsg.value = err.message || t('question.saveFailed')
        } finally {
            saving.value = false
        }
    }

    // Modal 模式：弹窗打开时初始化 form
    watch(open, (val) => {
        if (val) {
            justSaved = false
            initForm()
        } else {
            // 取消关闭（未保存）：还原 props.question 到原始状态
            if (!justSaved && originalData && props.question) {
                const q = props.question
                q.name = originalData.name; q.type = originalData.type; q.point = originalData.point
                q.content = Array.isArray(originalData.content) ? JSON.parse(JSON.stringify(originalData.content)) : originalData.content
                q.options = originalData.options != null ? JSON.parse(JSON.stringify(originalData.options)) : []
                q.answer = Array.isArray(originalData.answer) ? [...originalData.answer] : []
                q.explanation = originalData.explanation || ''
                q.tags = Array.isArray(originalData.tags) ? [...originalData.tags] : []
                q.extra = originalData.extra ?? null
            }
            justSaved = false
            form.value = null
            saveMsg.value = ''
        }
    }, { immediate: true })

    // 内联模式：组件加载时初始化 form
    watch(() => props.question, () => {
        if (!isModal.value) initForm()
    }, { immediate: true })

    const ctx = {
        t, isModal, open, form, typeOptions, typeComponent,
        saving, saveMsg, saveOk, showJsonEditor, jsonText, jsonError,
        aiStreaming, currentTypePrompt, hasTypePrompt, copyCopied,
        AiGenerator, onTypeChange, resetForm, copyCurrentPrompt,
        saveQuestion, onAiStreaming, onAiStreamText, onAiGenerated,
    }
    provide(QuestionEditKey, ctx)
    return ctx
}
