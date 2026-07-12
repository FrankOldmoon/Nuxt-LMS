import { reactive, ref, computed, watch, onMounted, onBeforeUnmount, nextTick, provide, inject, type InjectionKey } from 'vue'
import { computeCorrectRate, decryptAnswer } from '../question/render/shared'

export interface QuizRenderProps {
    node?: any
    courseId?: number
}

export type QuizRenderEmit = (event: 'saved', ...args: any[]) => void

type QuizRenderCtx = ReturnType<typeof useQuizRender>
export const QuizRenderKey: InjectionKey<QuizRenderCtx> = Symbol('QuizRender')
export function useQuizRenderContext() {
    const ctx = inject(QuizRenderKey)
    if (!ctx) throw new Error('useQuizRenderContext must be used within quiz/render.vue')
    return ctx
}

export function useQuizRender(props: QuizRenderProps, emit: QuizRenderEmit) {
    const { t } = useI18n()
    const { courseId } = useLmsContext()
    const effectiveCourseId = computed(() => {
        if (props.courseId !== undefined && props.courseId !== null && props.courseId !== '') {
            return Number(props.courseId) || 0
        }
        return courseId.value
    })
    const { user, hasRole } = useAuth()
    const isLoggedIn = computed(() => !!user.value)
    const toast = useToast()
    const { moduleLms } = useRuntimeConfig().public
    const QuizRecordsModal = null
    const chapterTask = useChapterTask()

    const quizId = computed(() => Number(props.node?.attrs?.content) || 0)
    const isTeacher = computed(() => hasRole('teacher') || hasRole('admin'))

    const editOpen = ref(false)
    const recordsOpen = ref(false)

    const defaultQuiz = reactive({
        name: '', point: 100, timeLimit: 600, submitLimit: 1,
        questions: [], startAt: null, endAt: null, content: '',
    })

    const apiUrl = computed(() => {
        if (!quizId.value || !effectiveCourseId.value) return ''
        return `/api/quizzes/show?course_id=${effectiveCourseId.value}&cid=${quizId.value}`
    })

    const { data: fetchedQuiz, pending, refresh } = cRequest.use(apiUrl, {
        transform: (raw: any) => {
            if (!raw) return null
            return reactive({
                name: raw.name || '',
                point: Number(raw.point) || 100,
                timeLimit: Number(raw.timeLimit) || 600,
                submitLimit: Number(raw.submitLimit) || 1,
                questions: raw.questions || [],
                startAt: raw.startAt,
                endAt: raw.endAt,
                content: raw.content || '',
            })
        },
    })

    const quiz = ref<any>(defaultQuiz)
    watch([fetchedQuiz, quizId], () => {
        if (!quizId.value) {
            quiz.value = defaultQuiz
        } else if (fetchedQuiz.value) {
            quiz.value = fetchedQuiz.value
        }
    }, { immediate: true, flush: 'sync' })

    const quizQuestions = computed(() => {
        const raw = quiz.value?.questions
        if (!Array.isArray(raw)) return []
        return raw.map((item: any) => {
            if (typeof item === 'number') return { id: item, point: 1 }
            if (item && typeof item === 'object') return { id: Number(item.id), point: Number(item.point) || 1 }
            return null
        }).filter(Boolean)
    })

    // ====================== 状态变量 ======================
    const userRecord = ref<any>(null)
    const recordFetched = ref(false)
    const started = ref(false)
    const submitted = ref(false)
    const submitting = ref(false)
    const resultScore = ref<any>(null)
    const resultPassed = ref(false)
    const confirmOpen = ref(false)
    const currentIndex = ref(0)
    const remainingTime = ref(0)
    const totalTime = ref(0)
    const questionRefs: any[] = []
    const answeredSet = ref(new Set<number>())
    const questionStates = reactive<Record<number, any>>({})
    let timerInterval: any = null

    watch(quizQuestions, (qs) => {
        qs.forEach((q: any, idx: number) => {
            if (!questionStates[idx]) {
                questionStates[idx] = { record: [], rate: 0, point: q.point, answered: false, correct: null }
            }
        })
    }, { immediate: true })

    function syncQuestionStates() {
        quizQuestions.value.forEach((q: any, idx: number) => {
            const comp = questionRefs[idx]
            if (!comp) return
            const qData = comp.getQuestionData?.()
            if (!qData) return
            if (Array.isArray(qData.answer) && qData.answer.some((a: any) => typeof a === 'string' && a.startsWith('enc:'))) {
                qData.answer = decryptAnswer(qData.answer)
            }
            const record = qData.record ? [...qData.record] : []
            const rate = computeCorrectRate(qData)
            const answered = !!(comp.hasAnswer || record.length > 0)
            questionStates[idx] = {
                record, rate, point: q.point, answered,
                correct: record.length > 0 ? rate > 0 : null,
            }
        })
    }

    async function fetchRecord() {
        if (isTeacher.value) return
        if (!quizId.value || !effectiveCourseId.value) return
        try {
            const data = await cRequest(`/api/quizzes/record?course_id=${effectiveCourseId.value}&cid=${quizId.value}`)
            if (data) {
                if (data.startedAt && !data.submitedAt) {
                    const elapsed = Math.floor((Date.now() - new Date(data.startedAt).getTime()) / 1000)
                    const limit = quiz.value.timeLimit || 600
                    remainingTime.value = Math.max(0, limit - elapsed)
                    totalTime.value = limit
                    if (remainingTime.value > 0) {
                        started.value = true
                        submitted.value = false
                        resumeTimer()
                        nextTick(() => {
                            if (Array.isArray(data.records)) {
                                fillRecordsToQuestions(data.records)
                            }
                        })
                    } else {
                        userRecord.value = data
                    }
                } else {
                    userRecord.value = data
                    nextTick(() => fillRecordsToQuestions(data.records))
                }
            }
        } catch (err) { /* 静默 */ }
        recordFetched.value = true
    }

    function onHover() {
        fetchRecord()
    }

    function fillRecordsToQuestions(records: any[]) {
        if (!Array.isArray(records) || !records.length) return
        const recordsMap = new Map(records.map(r => [Number(r.questionCid), r]))
        quizQuestions.value.forEach((q: any, idx: number) => {
            const rec = recordsMap.get(q.id)
            if (!rec) return
            const comp = questionRefs[idx]
            if (comp?.fillFromRecord) {
                comp.fillFromRecord(rec.answer || [], rec.rate)
            }
            questionStates[idx] = {
                record: rec.answer || [], rate: rec.rate || 0,
                point: q.point, answered: true, correct: rec.rate > 0,
            }
        })
    }

    onMounted(() => {
        if (isTeacher.value) return
        fetchRecord()
        const syncTimer = setInterval(() => {
            if (questionRefs.length > 0) {
                syncQuestionStates()
                updateAnsweredSet()
            }
        }, 500)
        setTimeout(() => clearInterval(syncTimer), 30000)
    })

    const canStart = computed(() => {
        const now = Date.now()
        if (quiz.value?.startAt && now < new Date(quiz.value.startAt).getTime()) return false
        if (quiz.value?.endAt && now > new Date(quiz.value.endAt).getTime()) return false
        return true
    })

    const notStartedReason = computed(() => {
        const now = Date.now()
        if (quiz.value?.startAt && now < new Date(quiz.value.startAt).getTime()) {
            return `${t('quiz.startAt')}: ${formatDateTime(quiz.value.startAt)}`
        }
        if (quiz.value?.endAt && now > new Date(quiz.value.endAt).getTime()) {
            return t('quiz.ended')
        }
        return ''
    })

    const canRetry = computed(() => {
        if (!userRecord.value) return false
        const submitLimit = quiz.value?.submitLimit || 1
        return (userRecord.value.submitCount || 0) < submitLimit
    })

    const timeProgress = computed(() => {
        if (!totalTime.value) return 0
        return (remainingTime.value / totalTime.value) * 100
    })

    const answeredCount = computed(() => answeredSet.value.size)

    function updateAnsweredSet() {
        syncQuestionStates()
        const newSet = new Set<number>()
        Object.entries(questionStates).forEach(([idx, s]) => {
            if (s.answered) newSet.add(Number(idx))
        })
        answeredSet.value = newSet
    }

    function startQuiz() {
        started.value = true
        submitted.value = false
        resultScore.value = null
        currentIndex.value = 0
        remainingTime.value = quiz.value.timeLimit || 600
        totalTime.value = quiz.value.timeLimit || 600
        answeredSet.value = new Set()
        Object.keys(questionStates).forEach(key => {
            questionStates[Number(key)] = { record: [], rate: 0, point: quizQuestions.value[Number(key)]?.point || 1, answered: false, correct: null }
        })
        nextTick(() => {
            questionRefs.forEach((comp) => {
                comp?.resetForQuiz?.()
            })
        })
        cRequest('/api/quizzes/submit', {
            method: 'POST',
            body: {
                course_id: courseId.value,
                quiz_cid: quizId.value,
                records: [],
                start_only: true,
            },
        }).catch(() => { })
        resumeTimer()
    }

    function resumeTimer() {
        if (timerInterval) clearInterval(timerInterval)
        timerInterval = setInterval(() => {
            remainingTime.value = Math.max(0, remainingTime.value - 1)
            updateAnsweredSet()
            if (remainingTime.value <= 0) {
                clearInterval(timerInterval)
                submitQuiz()
            }
        }, 1000)
    }

    function formatTime(seconds: number) {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }

    function formatDateTime(d: any) {
        if (!d) return ''
        const date = new Date(d)
        const pad = (n: number) => String(n).padStart(2, '0')
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
    }

    function collectAnswers() {
        questionRefs.forEach((comp) => {
            comp?.showResult?.()
        })
        syncQuestionStates()
        return quizQuestions.value.map((q: any, idx: number) => {
            const s = questionStates[idx] || { record: [], rate: 0, point: q.point }
            return {
                questionCid: q.id,
                rate: s.rate || 0,
                point: q.point,
                answer: s.record || [],
            }
        })
    }

    function confirmSubmit() {
        confirmOpen.value = true
    }

    function getQuestionBtnClass(idx: number) {
        const isCurrent = currentIndex.value === idx
        const s = questionStates[idx]
        if (submitted.value || userRecord.value) {
            if (s?.correct === true) return isCurrent ? 'border-green-500 bg-green-500 text-white' : 'border-green-400 bg-green-50 dark:bg-green-900/30 text-green-600'
            if (s?.correct === false) return isCurrent ? 'border-red-500 bg-red-500 text-white' : 'border-red-400 bg-red-50 dark:bg-red-900/30 text-red-600'
        }
        if (s?.answered) return isCurrent ? 'border-orange-500 bg-orange-500 text-white' : 'border-orange-400 bg-orange-50 dark:bg-orange-900/30 text-orange-600'
        return isCurrent
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
    }

    function switchQuestion(idx: number) {
        if (idx < 0 || idx >= quizQuestions.value.length) return
        currentIndex.value = idx
        updateAnsweredSet()
    }

    async function submitQuiz() {
        if (!isLoggedIn.value) {
            toast.add({ title: t('common.loginRequired'), color: 'warning' })
            return
        }
        if (submitting.value) return
        confirmOpen.value = false
        submitting.value = true
        if (timerInterval) clearInterval(timerInterval)
        try {
            const records = collectAnswers()
            const result = await cRequest('/api/quizzes/submit', {
                method: 'POST',
                body: {
                    course_id: courseId.value,
                    quiz_cid: quizId.value,
                    records,
                },
            })
            resultScore.value = result.score
            resultPassed.value = result.isPassed
            submitted.value = true
            started.value = false
            chapterTask?.reportNodeDone('quiz', quizId.value, !!result.isPassed)
            await fetchRecord()
            useUserCard().refresh()
        } catch (err) {
            started.value = true
            submitted.value = false
            if (remainingTime.value > 0) {
                timerInterval = setInterval(() => {
                    remainingTime.value = Math.max(0, remainingTime.value - 1)
                    updateAnsweredSet()
                    if (remainingTime.value <= 0) {
                        clearInterval(timerInterval)
                        submitQuiz()
                    }
                }, 1000)
            }
        } finally {
            submitting.value = false
        }
    }

    function onSaved(qz: any) {
        if (quiz.value) {
            Object.assign(quiz.value, qz)
        }
        emit('saved', qz)
    }

    onBeforeUnmount(() => {
        if (timerInterval) clearInterval(timerInterval)
    })

    const ctx = {
        t, courseId, effectiveCourseId, moduleLms, QuizRecordsModal,
        quiz, pending, quizId, isTeacher, editOpen, recordsOpen,
        userRecord, started, submitted, submitting, resultScore, resultPassed,
        confirmOpen, currentIndex, remainingTime, totalTime, questionRefs,
        quizQuestions, canStart, notStartedReason, canRetry, timeProgress,
        answeredCount, formatTime, formatDateTime, onHover, startQuiz,
        getQuestionBtnClass, switchQuestion, confirmSubmit, submitQuiz,
        onSaved, refresh,
    }
    provide(QuizRenderKey, ctx)
    return ctx
}
