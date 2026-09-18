import { reactive, ref, computed, watch, onMounted, onBeforeUnmount, nextTick, provide, inject, type InjectionKey } from 'vue'

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

/**
 * 提交失败中"不可重试"的错误码：超时作废 / 次数用尽 / 未开放等。
 * 这些情况重试也不会成功，必须停止自动重试，否则会每 60s 反复请求失败。
 */
const TERMINAL_SUBMIT_CODES = new Set([
    'quiz_time_up',
    'quiz_submit_limit',
    'quiz_ended',
    'quiz_not_started',
    'quiz_not_found',
])

export function useQuizRender(props: QuizRenderProps, emit: QuizRenderEmit) {
    const { t } = useI18n()
    const { courseId, chapterId } = useLmsContext()
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
        name: '', point: 100, timeLimit: 600, submitLimit: 1, switchLimit: 0,
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
                switchLimit: Number(raw.switchLimit) || 0,
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
    // 进行中但已超过时限、从未提交的记录（本次作答作废，可重试）
    const expiredRecord = ref<any>(null)
    const expiredUnsubmitted = computed(() => !!expiredRecord.value)
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
    const switchCount = ref(0)
    let timerInterval: any = null
    // 计时锚点：剩余时间以 deadlineTs 反推，避免后台标签页 setInterval 被节流导致"多给时间"
    let deadlineTs = 0
    // 一次"离开"只计一次（blur / visibilitychange 可能同时触发）
    let awayCounted = false

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
            const record = qData.record ? [...qData.record] : []
            const answered = !!(comp.hasAnswer || record.length > 0)
            // show 不下发答案，答题过程中不做本地判分（correct 仅在提交后由服务端结果回填）
            const prevCorrect = questionStates[idx]?.correct ?? null
            questionStates[idx] = {
                record, rate: questionStates[idx]?.rate || 0, point: q.point, answered,
                correct: prevCorrect,
            }
        })
    }

    async function fetchRecord() {
        if (!isLoggedIn.value || isTeacher.value) return
        if (!quizId.value || !effectiveCourseId.value) return
        // 等待测验配置就绪：resume 时剩余时间依赖 timeLimit，若配置尚未加载会按默认 600s 误算
        if (pending.value) {
            await new Promise<void>((resolve) => {
                const stop = watch(pending, (p) => {
                    if (!p) { stop(); resolve() }
                })
            })
        }
        try {
            const data = await cRequest(`/api/quizzes/record?course_id=${effectiveCourseId.value}&cid=${quizId.value}`)
            if (data) {
                if (data.startedAt && !data.submitedAt) {
                    const elapsed = Math.floor((Date.now() - new Date(data.startedAt).getTime()) / 1000)
                    const limit = Number(quiz.value?.timeLimit) || 600
                    remainingTime.value = Math.max(0, limit - elapsed)
                    totalTime.value = limit
                    if (remainingTime.value <= 0) {
                        // 时间已到但从未提交：作答未持久化，本次作废。
                        // 不能塞进 userRecord（那会被当成"已提交"显示分数），单独标记以提示"超时未提交"。
                        userRecord.value = null
                        expiredRecord.value = data
                    } else if (canStart.value) {
                        expiredRecord.value = null
                        started.value = true
                        submitted.value = false
                        resumeTimer()
                        nextTick(() => {
                            if (Array.isArray(data.records)) {
                                fillRecordsToQuestions(data.records)
                            }
                        })
                    } else {
                        // 时间未到但测验已不在开放窗口（如 endAt 已过）：不恢复答题
                        userRecord.value = null
                        expiredRecord.value = null
                        started.value = false
                    }
                } else {
                    expiredRecord.value = null
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
        updateAnsweredSet()
    }

    onMounted(() => {
        // 切屏检测：标签页隐藏/窗口失焦都算一次，回到页面时按配置决定是否自动提交
        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('blur', handleAway)
        window.addEventListener('focus', handleReturn)
        if (isTeacher.value) return
        fetchRecord()
        // 已答计数：回填/恢复后在 nextTick 刷新一次，答题中的每秒刷新由倒计时 tick 驱动，
        // 不再用 500ms 轮询（轮询既多余又会在后台标签页被节流）
        nextTick(() => updateAnsweredSet())
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
        const rec = userRecord.value || expiredRecord.value
        if (!rec) return false
        const submitLimit = quiz.value?.submitLimit || 1
        return (rec.submitCount || 0) < submitLimit
    })

    const timeProgress = computed(() => {
        if (!totalTime.value) return 0
        return (remainingTime.value / totalTime.value) * 100
    })

    // 允许的最大切屏次数：0 表示不限制（关闭该功能）
    const switchLimit = computed(() => Number(quiz.value?.switchLimit) || 0)
    const switchLimitEnabled = computed(() => switchLimit.value > 0)

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
        // 防止重复调用（连点/重复进入时重复发送 start_only）
        if (started.value) return
        // 未登录不能开始答题（与提交时校验一致，避免游客白答题倒计时）
        if (!isLoggedIn.value) {
            toast.add({ title: t('common.loginRequired'), color: 'warning' })
            return
        }
        started.value = true
        submitted.value = false
        resultScore.value = null
        currentIndex.value = 0
        remainingTime.value = quiz.value.timeLimit || 600
        totalTime.value = quiz.value.timeLimit || 600
        switchCount.value = 0
        awayCounted = false
        expiredRecord.value = null
        answeredSet.value = new Set()
        Object.keys(questionStates).forEach(key => {
            questionStates[Number(key)] = { record: [], rate: 0, point: quizQuestions.value[Number(key)]?.point || 1, answered: false, correct: null }
        })
        nextTick(() => {
            questionRefs.forEach((comp) => {
                comp?.resetForQuiz?.()
            })
            updateAnsweredSet()
        })
        cRequest('/api/quizzes/submit', {
            method: 'POST',
            body: {
                course_id: effectiveCourseId.value,
                quiz_cid: quizId.value,
                records: [],
                start_only: true,
            },
        }).catch(() => { })
        resumeTimer()
    }

    function resumeTimer() {
        stopTimer()
        // 以当前剩余时间建立新的计时锚点（resume 场景剩余时间已按 startedAt 校准）
        deadlineTs = Date.now() + remainingTime.value * 1000
        timerInterval = setInterval(() => {
            remainingTime.value = Math.max(0, Math.ceil((deadlineTs - Date.now()) / 1000))
            updateAnsweredSet()
            if (remainingTime.value <= 0) {
                stopTimer()
                submitQuiz()
            }
        }, 1000)
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval)
            timerInterval = null
        }
    }

    // ====================== 切屏检测 ======================
    // 仅统计"答题中"的切屏（开始答题后、未提交前）；教师预览不计。
    function isAnswering() {
        return started.value && !submitted.value && !submitting.value && !isTeacher.value
    }

    function handleAway() {
        if (!isAnswering()) return
        // blur 与 visibilitychange 可能同时触发，同一次离开只计一次
        if (awayCounted) return
        awayCounted = true
        switchCount.value += 1
    }

    function handleReturn() {
        if (!awayCounted) return
        awayCounted = false
        if (!isAnswering()) return
        // 回到页面先按锚点校准剩余时间（后台标签页计时会被浏览器节流）
        if (deadlineTs) {
            remainingTime.value = Math.max(0, Math.ceil((deadlineTs - Date.now()) / 1000))
        }
        // 离开期间时间已耗尽 → 自动提交
        if (remainingTime.value <= 0) {
            stopTimer()
            submitQuiz()
            return
        }
        // 切屏次数超过上限 → 回到页面自动提交
        if (switchLimitEnabled.value && switchCount.value > switchLimit.value) {
            toast.add({
                title: t('quiz.switchExceeded'),
                description: t('quiz.switchExceededDesc', { n: switchCount.value, limit: switchLimit.value }),
                color: 'warning',
            })
            submitQuiz()
        }
    }

    function handleVisibilityChange() {
        if (typeof document === 'undefined') return
        if (document.hidden) handleAway()
        else handleReturn()
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
        stopTimer()
        try {
            const records = collectAnswers()
            const parentCourseId = useEmbeddingParentCourse()
            const result = await cRequest('/api/quizzes/submit', {
                method: 'POST',
                body: {
                    course_id: effectiveCourseId.value,
                    chapter_id: chapterId?.value || 0,
                    quiz_cid: quizId.value,
                    records,
                    ...(parentCourseId ? { parent_course_id: parentCourseId } : {}),
                },
            })
            resultScore.value = result.score
            resultPassed.value = result.isPassed
            submitted.value = true
            started.value = false
            // 服务端判分：用响应中的每题结果回填红绿状态（rate 由服务端重算）
            if (Array.isArray(result.records)) {
                nextTick(() => fillRecordsToQuestions(result.records))
            }
            // 提交后 toast 提示：得分 + 是否通过 + 经验
            const gainedExp = Number(result?.gainedExp) || 0
            const scoreVal = Math.round(Number(result?.score) || 0)
            const titleKey = result.isPassed ? 'quiz.submitPassed' : 'quiz.submitFinished'
            const descKey = gainedExp > 0
                ? (result.isPassed ? 'quiz.submitScoreExpPassed' : 'quiz.submitScoreExp')
                : 'quiz.submitScore'
            toast.add({
                title: t(titleKey),
                description: t(descKey, { score: scoreVal, exp: gainedExp }),
                color: result.isPassed ? 'success' : 'info',
            })
            chapterTask?.reportNodeDone('quiz', quizId.value, !!result.isPassed)
            await fetchRecord()
            useUserCard().refresh()
        } catch (err: any) {
            toast.add({
                title: t('quiz.submitFailed'),
                description: err?.message,
                color: 'error',
            })
            // 不可重试的失败（超时作废 / 次数用尽 / 已结束等）：停止重试，刷新记录让 UI 呈现真实状态
            if (err?.code && TERMINAL_SUBMIT_CODES.has(err.code)) {
                started.value = false
                submitted.value = false
                await fetchRecord()
                return
            }
            // 可重试失败（网络抖动等）：恢复答题并重新计时；到点提交失败给 60 秒缓冲
            started.value = true
            submitted.value = false
            if (remainingTime.value <= 0) {
                remainingTime.value = 60
                totalTime.value = Math.max(totalTime.value, 60)
            }
            resumeTimer()
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
        stopTimer()
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('blur', handleAway)
        window.removeEventListener('focus', handleReturn)
    })

    const ctx = {
        t, courseId, effectiveCourseId, moduleLms, QuizRecordsModal,
        quiz, pending, quizId, isTeacher, editOpen, recordsOpen,
        userRecord, expiredRecord, expiredUnsubmitted,
        started, submitted, submitting, resultScore, resultPassed,
        confirmOpen, currentIndex, remainingTime, totalTime, questionRefs,
        quizQuestions, canStart, notStartedReason, canRetry, timeProgress,
        switchCount, switchLimit, switchLimitEnabled,
        answeredCount, formatTime, formatDateTime, onHover, startQuiz,
        getQuestionBtnClass, switchQuestion, confirmSubmit, submitQuiz,
        onSaved, refresh,
    }
    provide(QuizRenderKey, ctx)
    return ctx
}
