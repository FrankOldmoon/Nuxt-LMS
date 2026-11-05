import { reactive, ref, computed, provide, inject, watch, type InjectionKey } from 'vue'
import { computeCorrectRate, getShuffledOptionOrder } from './render/shared'
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

// OJ 题型：同一会话内每个 OJ 题只查一次 OJ 状态（key: courseId:questionId），
// 避免重复调用外部 OJ；手动复查走 useOj.ts 的完整查询，不受此缓存影响
const ojChecked = new Set<string>()

export interface QuestionRenderProps {
    node?: any
    question?: any
    inQuiz?: boolean
    courseId?: number
    /** 预先回填的学生作答（答卷回显）：{ record: 答案数组, rate?: 得分比 } */
    initialRecord?: { record: any[]; rate?: number }
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

    // race 模式：判分由 useRaceRender 走 verify 接口（show 不下发答案，本地无法判定），
    // 这里仅进入"已提交"状态 + 通知 race 显式提交
    const inRace = inject('inRace', false)
    // evaluation 评估对话内联题目答题回调
    const onEvaluationAnswered = inject('onEvaluationAnswered', null)
    // race 提交回调：由 race/useRaceRender 注入（inRace 模式下点击提交时调用）
    const onRaceSubmit = inject('onRaceSubmit', null)

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
    // 尚未设置内容：节点上没有 cid，也不是内联题（内联题 content 是题目对象）、
    // 也没有外部直接传入的 question（试卷/答卷预览场景）
    // → 不渲染空题目，由 render.vue 显示"请先设置内容"提示
    const isUnset = computed(() => !inlineQuestion.value && !questionId.value && !props.question)

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

    // 提交后 3 秒禁用提交按钮（防止连点/重复提交）
    const submitLocked = ref(false)
    let submitLockTimer: ReturnType<typeof setTimeout> | null = null
    function lockSubmit() {
        submitLocked.value = true
        if (submitLockTimer) clearTimeout(submitLockTimer)
        submitLockTimer = setTimeout(() => { submitLocked.value = false }, 3000)
    }

    const containerBorderClass = computed(() => {
        if (submitted.value && isCorrect.value) return 'border-green-400 dark:border-green-500'
        if (submitted.value && !isCorrect.value) return 'border-red-400 dark:border-red-500'
        return 'border-amber-400 dark:border-amber-500'
    })

    // provide 给子组件
    provide('questionSubmitted', submitted)
    provide('questionIsCorrect', isCorrect)
    provide('questionFromRecord', fromRecord)
    provide('questionId', questionId)
    // 多选题「显示答案」时选项按原始顺序展示，叶子组件（useMultiple）据此切换顺序
    provide('questionShowAnswer', showAnswer)
    // html 题在 iframe 上报 rate=1 时触发的"真正提交按钮"路径（走 onSubmit 全流程，
    // 而非子组件叶子 submit，确保提交状态/toast/烟花/进度上报同步触发）。onSubmit 为函数声明，已被提升。
    provide('questionTriggerAutoSubmit', onSubmit)

    const hasAnswer = computed(() => renderRef.value?.hasAnswer ?? false)
    const isTeacher = computed(() => hasRole('teacher') || hasRole('admin'))
    // 竞赛模式：学生答过一次后本场即锁定，禁用「提交/重置」
    const answerLocked = computed(() => !!inRace && submitted.value)

    // 格式化答案（根据题型不同显示方式不同）
    const formattedAnswers = computed(() => {
        if (!question.value?.answer) return []
        const answer = question.value.answer
        const type = question.value.type
        if (type === 'single' || type === 'multiple') {
            // 多选题「显示答案」时选项已按原始顺序排列，字母即原始下标
            if (type === 'multiple' && showAnswer.value) {
                return answer.map((idx: number) => String.fromCharCode(65 + idx))
            }
            // 选项随机展示：答案存的是原始下标，这里映射为展示位置字母，与题面选项标号一致
            const order = getShuffledOptionOrder(question.value)
            const posOf = new Map(order.map((ori: number, pos: number) => [ori, pos]))
            return answer.map((idx: number) => String.fromCharCode(65 + (posOf.has(idx) ? posOf.get(idx)! : idx)))
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

    async function onSubmit() {
        if (!isLoggedIn.value) {
            toast.add({ title: t('common.loginRequired'), color: 'warning' })
            return
        }
        if (!renderRef.value) return
        if (inRace) {
            // 竞赛模式：判分由 useRaceRender 走 verify 接口（show 不下发答案，本地无法判定），
            // 这里仅进入"已提交"状态并通知 race 显式提交
            submitted.value = true
            fromRecord.value = false
            lockSubmit()
            onRaceSubmit?.()
            return
        }
        const result = await renderRef.value.submit()
        if (result) {
            isCorrect.value = result.isCorrect
            submitted.value = true
            fromRecord.value = false
            showFireworks.value = result.isCorrect
            lockSubmit()
            // 提交后 toast 提示：答对/已提交
            toast.add({
                title: result.isCorrect ? t('question.correct') : t('question.wrong'),
                color: result.isCorrect ? 'success' : 'error',
            })
            if (!props.inQuiz) {
                // heading 完成以 100% 正确为准（加分仍按 isCorrect = rate>0 单独判定）。
                // rate 取 submitQuestion 写回 question.correct_rate（服务端返回），
                // 与刷新/记录恢复路径同源；各题型 submit() 只回传 isCorrect，不含 rate。
                chapterTask?.reportNodeDone('question', questionId.value, (question.value?.correct_rate || 0) >= 1)
            }
            emit('submitted', { isCorrect: isCorrect.value, questionId: questionId.value })
            // 通知聊天页：这次作答要进入对话上下文，AI 下一轮才知道学生刚答错还是答对。
            // 题目渲染在 UeditorRender 深处，emit 传不到页面，用 window 事件桥接。
            if (import.meta.client) {
                window.dispatchEvent(new CustomEvent('lms:question-submitted', {
                    detail: {
                        courseId: effectiveCourseId.value,
                        cid: questionId.value,
                        name: question.value?.name || '',
                        type: question.value?.type || '',
                        isCorrect: isCorrect.value,
                        rate: question.value?.correct_rate ?? 0,
                    },
                }))
            }
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
                // extra：扩展字段（含 optionMarkdown 选项级 markdown 开关）
                extra: raw.extra ?? null,
            })
        },
    })

    const question = ref<any>(props.question || defaultQuestion)
    // 答卷回显：每题只应用一次 initialRecord（key = questionId）
    const appliedInitialKey = ref<string | null>(null)
    watch([() => props.question, () => inlineQuestion.value, fetchedQuestion, questionId], () => {
        if (props.question) { question.value = props.question; return }
        if (inlineQuestion.value) {
            const q = inlineQuestion.value
            question.value = reactive({
                name: q.name || '', content: q.content ?? '', options: q.options != null ? q.options : [],
                type: q.type || 'single', point: Number(q.point) || 0,
                answer: Array.isArray(q.answer) ? [...q.answer] : [], explanation: q.explanation ?? '',
                tags: Array.isArray(q.tags) ? [...q.tags] : [], record: [], correct_rate: 0,
                extra: q.extra ?? null,
            })
            return
        }
        if (!questionId.value) {
            question.value = defaultQuestion
        } else if (fetchedQuestion.value) {
            // show 已按角色剥离 answer/explanation（教师视角有明文，学生无）
            question.value = fetchedQuestion.value
            // 答卷回显：题目数据就绪后预填学生作答（组件挂载时 immediate watch 会同步到题型 UI）
            if (props.initialRecord && appliedInitialKey.value !== String(questionId.value)) {
                appliedInitialKey.value = String(questionId.value)
                fillFromRecord(props.initialRecord.record, props.initialRecord.rate)
            }
        }
    }, { immediate: true, flush: 'sync' })

    provide('questionData', question)
    provide('inQuiz', props.inQuiz)
    provide('inQuestion', true)

    const pending = computed(() => !!questionId.value && fetchedPending.value)

    watch(() => question.value?.record, () => {
        if (!question.value) return
        // show 不下发答案：学生端 DB 题 answer 为 undefined，无法本地判分，
        // correct_rate 由提交响应 / 服务端记录写入；内联题（AI 生成）与教师视角仍可实时计算
        if (question.value.answer !== undefined) {
            question.value.correct_rate = computeCorrectRate(question.value)
        }
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
        if (!isLoggedIn.value || !questionId.value || !cid) return
        if (question.value?.type === 'evaluation') return
        // OJ 题：同一会话内只查询一次 OJ 状态，避免重复调用外部 OJ（手动复查仍走完整流程）
        const isOj = question.value?.type === 'oj'
        const ojKey = `${cid}:${questionId.value}`
        const skipOj = isOj && ojChecked.has(ojKey)
        if (isOj) ojChecked.add(ojKey)
        try {
            const data = await cRequest(`/api/questions/record?course_id=${cid}&cid=${questionId.value}${skipOj ? '&skip_oj=1' : ''}`)
            if (data && question.value && Array.isArray(data.records) && data.records.length > 0) {
                question.value.record = [...data.records]
                // show 不再下发答案，correct_rate 直接用服务端存储值（userQuestions.correctRate）
                question.value.correct_rate = Math.max(0, Math.min(1, Number((data as any).correctRate) || 0))
                submitted.value = true
                fromRecord.value = true
                isCorrect.value = (question.value.correct_rate || 0) >= 1
                chapterTask?.reportNodeDone('question', questionId.value, (question.value.correct_rate || 0) >= 1)
                emit('submitted', { isCorrect: isCorrect.value, questionId: questionId.value })
            }
        } catch (err) { /* 静默忽略 */ }
    }

    const ctx = {
        t, effectiveCourseId, moduleLms, RecordsModal,
        question, pending, questionId, isUnset, isTeacher, typeLabel,
        submitted, isCorrect, showAnswer, fromRecord, showFireworks,
        containerBorderClass, hasAnswer, answerLocked, scoreDisplay, formattedAnswers,
        submitLocked,
        renderComponent, renderRef, editOpen, recordsOpen,
        onSubmit, onReset, onShowAnswer, onHover, onSaved,
        getQuestionData() { return question.value },
        fillFromRecord(record: any[], rate?: number) {
            if (question.value && Array.isArray(record)) {
                question.value.record = [...record]
                question.value.correct_rate = rate !== undefined ? rate : computeCorrectRate(question.value)
                submitted.value = true
                fromRecord.value = true
                isCorrect.value = (question.value.correct_rate || 0) >= 1
            }
        },
        showResult(rate?: number) {
            if (!question.value) return { rate: 0, record: [] }
            // 服务端判分：优先外部传入（verify 接口 / quiz 服务端结果），
            // 否则用最近一次提交时 submitQuestion 写入的 correct_rate
            const r = rate !== undefined ? rate : (question.value.correct_rate || 0)
            question.value.correct_rate = r
            submitted.value = true
            fromRecord.value = false
            isCorrect.value = r > 0
            return { rate: r, record: question.value.record ? [...question.value.record] : [] }
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
        /** 竞赛答完：把服务端返回的正确答案/解析注入题目并展示（footer 据此渲染答案区） */
        revealAnswer(answer: any, explanation?: any) {
            if (!question.value) return
            if (Array.isArray(answer)) question.value.answer = [...answer]
            if (explanation != null && explanation !== '') question.value.explanation = explanation
            showAnswer.value = true
            submitted.value = true
        },
    }
    provide(QuestionRenderKey, ctx)

    return ctx
}
