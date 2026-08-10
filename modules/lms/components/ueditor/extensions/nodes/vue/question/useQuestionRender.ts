import { reactive, ref, computed, provide, inject, watch, type InjectionKey } from 'vue'
import { computeCorrectRate, decryptAnswer } from './render/shared'
import SingleRender from './render/single.vue'
import JudgeRender from './render/judge.vue'
import MultipleRender from './render/multiple.vue'
import FillRender from './render/fill.vue'
import SelectRender from './render/select.vue'
import SortRender from './render/sort.vue'
import ClassifyRender from './render/classify.vue'
import PuzzleRender from './render/puzzle.vue'
import HtmlRender from './render/html.vue'
import ShortAnswerRender from './render/short-answer.vue'
import MatchRender from './render/match.vue'
import CompositeRender from './render/composite.vue'
import VideoRender from './render/video.vue'
import EvaluationRender from './render/evaluation.vue'
import OjRender from './render/oj.vue'

export interface QuestionRenderProps {
    node?: any
    question?: any
    inQuiz?: boolean
    courseId?: number
}

export type QuestionRenderEmit = (event: 'init' | 'submitted', ...args: any[]) => void

/** provide/inject 上下文（供 footer 等子组件使用） */
type QuestionRenderCtx = ReturnType<typeof useQuestionRender>
export const QuestionRenderKey: InjectionKey<QuestionRenderCtx> = Symbol('QuestionRender')
export function useQuestionRenderContext() {
    const ctx = inject(QuestionRenderKey)
    if (!ctx) throw new Error('useQuestionRenderContext must be used within Question render.vue')
    return ctx
}

export function useQuestionRender(props: QuestionRenderProps, emit: QuestionRenderEmit) {
    const { t } = useI18n()
    const { courseId: ctxCourseId } = useLmsContext()
    const effectiveCourseId = computed(() => props.courseId || ctxCourseId.value)
    const { hasRole, user } = useAuth()
    const { moduleLms } = useRuntimeConfig().public
    const RecordsModal =  null
    const chapterTask = useChapterTask()
    const toast = useToast()

    // race 模式：显示提交按钮但不向后端提交 question 记录
    const inRace = inject('inRace', false)
    // evaluation 评估对话内联题目答题回调
    const onEvaluationAnswered = inject('onEvaluationAnswered', null)

    const isLoggedIn = computed(() => !!user.value)

    // content 可能是 cid 字符串（DB 题目）或内联 JSON 对象（AI 生成的未保存题目）
    const inlineQuestion = computed(() => {
        const c = props.node?.attrs?.content
        return (c != null && typeof c === 'object' && !Array.isArray(c)) ? c : null
    })
    const questionId = computed(() => {
        if (inlineQuestion.value) return 0
        return Number(props.node?.attrs?.content) || 0
    })

    const typeLabel = computed(() => ({
        single: t('question.typeSingle'), judge: t('question.typeJudge'), multiple: t('question.typeMultiple'),
        fill: t('question.typeFill'), select: t('question.typeSelect'), sort: t('question.typeSort'),
        classify: t('question.typeClassify'), puzzle: t('question.typePuzzle'), html: t('question.typeHtml'),
        'short-answer': t('question.typeShortAnswer'), match: t('question.typeMatch'),
        composite: t('question.typeComposite'), video: t('question.typeVideo'), evaluation: t('question.typeEvaluation'),
        oj: t('question.typeOj'),
    }))

    // 题型 → 渲染组件
    const componentMap: Record<string, any> = {
        single: SingleRender, judge: JudgeRender, multiple: MultipleRender, fill: FillRender,
        select: SelectRender, sort: SortRender, classify: ClassifyRender, puzzle: PuzzleRender,
        html: HtmlRender, 'short-answer': ShortAnswerRender, match: MatchRender,
        composite: CompositeRender, video: VideoRender, evaluation: EvaluationRender, oj: OjRender,
    }
    const renderComponent = computed(() => componentMap[question.value?.type] || null)
    const renderRef = ref<any>(null)

    // 公共状态
    const submitted = ref(false)
    const isCorrect = ref(false)
    const showAnswer = ref(false)
    const fromRecord = ref(false)
    const showFireworks = ref(false)

    const containerBorderClass = computed(() => {
        if (submitted.value && isCorrect.value) return 'border-green-400 dark:border-green-500'
        if (submitted.value && !isCorrect.value) return 'border-red-400 dark:border-red-500'
        return 'border-gray-200 dark:border-gray-700'
    })

    // provide 给子组件
    provide('questionSubmitted', submitted)
    provide('questionIsCorrect', isCorrect)
    provide('questionFromRecord', fromRecord)

    const hasAnswer = computed(() => renderRef.value?.hasAnswer ?? false)
    const isTeacher = computed(() => hasRole('teacher') || hasRole('admin'))

    // 格式化答案（根据题型不同显示方式不同）
    const formattedAnswers = computed(() => {
        if (!question.value?.answer) return []
        const answer = question.value.answer
        const type = question.value.type
        if (type === 'single' || type === 'multiple') {
            return answer.map((idx: number) => String.fromCharCode(65 + idx))
        } else if (type === 'judge') {
            return answer.map((idx: number) => idx === 0 ? t('question.correct') : t('question.wrong'))
        } else if (type === 'sort') {
            const options = question.value.options || []
            return answer.map((idx: number) => options[idx] || `#${idx}`)
        } else if (type === 'classify') {
            const options = question.value.options || []
            return options.map((cat: any, ci: number) => {
                const items = (cat.items || []).join(', ')
                return `${cat.name || `#${ci + 1}`}: ${items}`
            })
        } else if (type === 'puzzle') {
            return [t('question.puzzleOriginalImage')]
        } else if (type === 'html') {
            return [t('question.htmlDeterminedByIframe')]
        } else if (type === 'short-answer') {
            return [`${t('question.shortAnswerRegex')}: ${answer[0] || ''}`]
        } else if (type === 'match') {
            const options = question.value.options || []
            return options.map((pair: any) => `${pair.left} ↔ ${pair.right}`)
        } else if (type === 'composite') {
            const subs = Array.isArray(question.value.content) ? question.value.content : []
            return [t('question.compositeSubCount', { count: subs.length })]
        } else if (type === 'evaluation') {
            const opts = question.value.options || {}
            const threshold = (opts && typeof opts === 'object' && !Array.isArray(opts) && typeof opts.threshold === 'number') ? opts.threshold : 0.8
            return [`${t('question.evaluationThresholdLabel')}: ${Math.round(threshold * 100)}%`]
        } else if (type === 'oj') {
            const opts = question.value.options || {}
            const pid = (opts && typeof opts === 'object' && !Array.isArray(opts)) ? opts.pid : ''
            return [pid ? `${t('question.ojPidLabel')}: ${pid}` : t('question.ojDeterminedByOj')]
        } else {
            const options = question.value.options || []
            return answer.map((ans: any, idx: number) => options[idx] === 'regex' ? `${ans} (${t('question.fillRegex')})` : String(ans))
        }
    })

    function onSubmit() {
        if (!isLoggedIn.value) {
            toast.add({ title: t('common.loginRequired'), color: 'warning' })
            return
        }
        if (!renderRef.value) return
        if (inRace) {
            const qData = question.value
            if (Array.isArray(qData.answer) && qData.answer.some((a: any) => typeof a === 'string' && a.startsWith('enc:'))) {
                qData.answer = decryptAnswer(qData.answer)
            }
            const rate = computeCorrectRate(qData)
            isCorrect.value = rate > 0
            submitted.value = true
            fromRecord.value = false
            showFireworks.value = isCorrect.value
            // 竞赛模式仅前端判定，toast 仅做提示
            toast.add({
                title: isCorrect.value ? t('question.correct') : t('question.wrong'),
                color: isCorrect.value ? 'success' : 'error',
            })
            return
        }
        const result = renderRef.value.submit()
        if (result) {
            isCorrect.value = result.isCorrect
            submitted.value = true
            fromRecord.value = false
            showFireworks.value = result.isCorrect
            // 提交后 toast 提示：答对/已提交
            toast.add({
                title: result.isCorrect ? t('question.correct') : t('question.wrong'),
                color: result.isCorrect ? 'success' : 'error',
            })
            if (!props.inQuiz) {
                chapterTask?.reportNodeDone('question', questionId.value, isCorrect.value)
            }
            emit('submitted', { isCorrect: isCorrect.value, questionId: questionId.value })
            if (onEvaluationAnswered) {
                onEvaluationAnswered({ isCorrect: isCorrect.value, question: question.value })
            }
        }
    }

    function onReset() {
        if (!renderRef.value) return
        renderRef.value.reset()
        submitted.value = false
        isCorrect.value = false
        showAnswer.value = false
        fromRecord.value = false
        showFireworks.value = false
        question.value.record = []
    }

    function onShowAnswer() {
        showAnswer.value = !showAnswer.value
        if (showAnswer.value && renderRef.value) {
            renderRef.value.fillCorrectAnswer()
        } else {
            onReset()
        }
    }

    // 默认单选题
    const defaultQuestion = reactive({
        name: '', content: '', options: ['', '', '', ''], type: 'single',
        point: 1, answer: [0], explanation: '', tags: [], record: [], correct_rate: 0,
    })

    const apiUrl = computed(() => {
        const cid = effectiveCourseId.value
        if (!questionId.value || !cid) return ''
        return `/api/questions/show?course_id=${cid}&cid=${questionId.value}`
    })

    const { data: fetchedQuestion, pending: fetchedPending, refresh } = cRequest.use(apiUrl, {
        transform: (raw: any) => {
            if (!raw) return null
            return reactive({
                name: raw.name || '',
                content: Array.isArray(raw.content) ? JSON.parse(JSON.stringify(raw.content)) : (raw.content || ''),
                options: raw.options != null ? JSON.parse(JSON.stringify(raw.options)) : [],
                type: raw.type || 'single',
                point: Number(raw.point) || 0,
                answer: Array.isArray(raw.answer) ? [...raw.answer] : [],
                explanation: raw.explanation || '',
                tags: Array.isArray(raw.tags) ? [...raw.tags] : [],
                record: Array.isArray(raw.record) ? JSON.parse(JSON.stringify(raw.record)) : [],
                correct_rate: 0,
            })
        },
    })

    const question = ref<any>(props.question || defaultQuestion)
    watch([() => props.question, () => inlineQuestion.value, fetchedQuestion, questionId], () => {
        if (props.question) { question.value = props.question; return }
        if (inlineQuestion.value) {
            const q = inlineQuestion.value
            question.value = reactive({
                name: q.name || '', content: q.content ?? '', options: q.options != null ? q.options : [],
                type: q.type || 'single', point: Number(q.point) || 0,
                answer: Array.isArray(q.answer) ? [...q.answer] : [], explanation: q.explanation ?? '',
                tags: Array.isArray(q.tags) ? [...q.tags] : [], record: [], correct_rate: 0,
            })
            return
        }
        if (!questionId.value) {
            question.value = defaultQuestion
        } else if (fetchedQuestion.value) {
            const q = fetchedQuestion.value
            if (import.meta.client && Array.isArray(q.answer) && q.answer.some((a: any) => typeof a === 'string' && a.startsWith('enc:'))) {
                q.answer = decryptAnswer(q.answer)
            }
            question.value = q
        }
    }, { immediate: true, flush: 'sync' })

    provide('questionData', question)
    provide('inQuiz', props.inQuiz)
    provide('inQuestion', true)

    const pending = computed(() => !!questionId.value && fetchedPending.value)

    watch(() => question.value?.record, () => {
        if (question.value) question.value.correct_rate = computeCorrectRate(question.value)
    }, { immediate: true, deep: true })

    const scoreDisplay = computed(() => {
        if (!question.value) return '[0/0]'
        const total = question.value.point || 0
        const rate = submitted.value ? (question.value.correct_rate || 0) : 0
        const obt = rate * total
        const fmt = (n: number) => Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(2)))
        return `[${fmt(obt)}/${fmt(total)}]`
    })

    const editOpen = ref(false)
    const recordsOpen = ref(false)

    function onSaved(ques: any) {
        if (ques.cid && Number(ques.cid) !== questionId.value) {
            emit('init', ques.cid)
        } else {
            refresh()
        }
        if (question.value) Object.assign(question.value, ques)
    }

    function onHover() {
        if (props.inQuiz || inRace || isTeacher.value) return
        fetchRecord()
    }
    async function fetchRecord() {
        const cid = effectiveCourseId.value
        if (!questionId.value || !cid) return
        if (question.value?.type === 'evaluation') return
        try {
            const data = await cRequest(`/api/questions/record?course_id=${cid}&cid=${questionId.value}`)
            if (data && question.value && Array.isArray(data.records) && data.records.length > 0) {
                question.value.record = [...data.records]
                question.value.correct_rate = computeCorrectRate(question.value)
                submitted.value = true
                fromRecord.value = true
                isCorrect.value = (question.value.correct_rate || 0) > 0
                chapterTask?.reportNodeDone('question', questionId.value, isCorrect.value)
                emit('submitted', { isCorrect: isCorrect.value, questionId: questionId.value })
            }
        } catch (err) { /* 静默忽略 */ }
    }

    const ctx = {
        t, effectiveCourseId, moduleLms, RecordsModal,
        question, pending, questionId, isTeacher, typeLabel,
        submitted, isCorrect, showAnswer, fromRecord, showFireworks,
        containerBorderClass, hasAnswer, scoreDisplay, formattedAnswers,
        renderComponent, renderRef, editOpen, recordsOpen,
        onSubmit, onReset, onShowAnswer, onHover, onSaved,
        getQuestionData() { return question.value },
        fillFromRecord(record: any[], rate?: number) {
            if (question.value && Array.isArray(record)) {
                question.value.record = [...record]
                question.value.correct_rate = rate !== undefined ? rate : computeCorrectRate(question.value)
                submitted.value = true
                fromRecord.value = true
                isCorrect.value = (question.value.correct_rate || 0) > 0
            }
        },
        showResult() {
            if (!question.value) return { rate: 0, record: [] }
            if (Array.isArray(question.value.answer) && question.value.answer.some((a: any) => typeof a === 'string' && a.startsWith('enc:'))) {
                question.value.answer = decryptAnswer(question.value.answer)
            }
            const rate = computeCorrectRate(question.value)
            question.value.correct_rate = rate
            submitted.value = true
            fromRecord.value = false
            isCorrect.value = rate > 0
            return { rate, record: question.value.record ? [...question.value.record] : [] }
        },
        resetForQuiz() {
            if (renderRef.value) renderRef.value.reset()
            submitted.value = false
            isCorrect.value = false
            fromRecord.value = false
            showAnswer.value = false
            showFireworks.value = false
            if (question.value) question.value.record = []
        },
    }
    provide(QuestionRenderKey, ctx)

    return ctx
}
