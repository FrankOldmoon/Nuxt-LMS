import { reactive, ref, computed, watch, onMounted, onBeforeUnmount, provide, inject, type InjectionKey } from 'vue'

export interface RaceRenderProps {
    node?: any
    courseId?: number | string
}

export type RaceRenderEmit = (event: 'saved', ...args: any[]) => void

type RaceRenderCtx = ReturnType<typeof useRaceRender>
export const RaceRenderKey: InjectionKey<RaceRenderCtx> = Symbol('RaceRender')
export function useRaceRenderContext() {
    const ctx = inject(RaceRenderKey)
    if (!ctx) throw new Error('useRaceRenderContext must be used within race/render.vue')
    return ctx
}

export function useRaceRender(props: RaceRenderProps, emit: RaceRenderEmit) {
    const { t } = useI18n()
    const { moduleLms } = useRuntimeConfig().public
    const { courseId, chapterId } = useLmsContext()
    const effectiveCourseId = computed(() => {
        if (props.courseId !== undefined && props.courseId !== null && props.courseId !== '') {
            return Number(props.courseId) || 0
        }
        return courseId.value
    })
    const { hasRole, user } = useAuth()
    const isLoggedIn = computed(() => !!user.value)
    const toast = useToast()
    const chapterTask = useChapterTask()
    const { wsConnected, connect, raceJoin, onRaceJoined, sendRaceStart, onRaceStart, sendRaceQuestion, onRaceQuestion, sendRaceAnswer, onRaceAnswerUpdate, onRaceScores, sendRaceQuestionEnd, onRaceQuestionEnd, sendRaceEnd, onRaceEnd, sendRaceOnline, onRaceOnlineUpdate } = useWebSocket()

    // 告知 question 组件当前在 race 中：显示提交按钮但不向后端提交，
    // 提交时触发 onRaceSubmit 回调（显式提交，避免 record 非空即自动提交）
    provide('inRace', true)
    provide('onRaceSubmit', () => { submitStudentAnswer() })

    const raceId = computed(() => Number(props.node?.attrs?.content) || 0)
    const isTeacher = computed(() => hasRole('teacher') || hasRole('admin'))
    const classId = computed(() => user.value?.defaultClass?.id || user.value?.classId || 0)
    // pin = classId_chapterId
    const pin = computed(() => `${classId.value}_${chapterId.value}`)

    // lms 未启用或未加入班级时不显示
    const canShow = computed(() => !!moduleLms && !!classId.value)
    const placeholderText = computed(() => {
        if (!moduleLms) return t('race.needLms')
        if (!classId.value) return t('chatroom.needClass')
        return ''
    })

    // 默认竞赛
    const defaultRace = reactive({
        name: '', gapTime: 30, point: 100, questionIds: [],
    })

    const apiUrl = computed(() => {
        if (!raceId.value || !effectiveCourseId.value) return ''
        return `/api/races/show?course_id=${effectiveCourseId.value}&cid=${raceId.value}`
    })

    const { data: fetchedRace, pending, refresh } = cRequest.use(apiUrl, {
        transform: (raw: any) => {
            if (!raw) return null
            return reactive({
                name: raw.name || '',
                gapTime: Number(raw.gapTime) || 30,
                point: Number(raw.point) || 100,
                questionIds: raw.questionIds || [],
            })
        },
    })

    const race = ref<any>(defaultRace)
    watch([fetchedRace, raceId], () => {
        if (!raceId.value) {
            race.value = defaultRace
        } else if (fetchedRace.value) {
            race.value = fetchedRace.value
        }
    }, { immediate: true, flush: 'sync' })

    // 规范化 questionIds 为数字数组
    const raceQuestions = computed(() => {
        const raw = race.value?.questionIds
        if (!Array.isArray(raw)) return []
        return raw.map((item: any) => typeof item === 'number' ? item : Number(item.id)).filter(Boolean)
    })

    // ====================== 状态变量 ======================
    const raceActive = ref(false)
    const currentIndex = ref(-1)
    const currentQuestionCid = ref(0)
    const timeRemaining = ref(0)
    const totalTime = ref(0)
    const studentAnswered = ref(false)
    const questionRef = ref<any>(null)
    // 题目结果 podium：前三名
    const questionTop3 = ref<any[]>([])
    const showPodium = ref(false)
    const raceScores = ref<any[]>([])
    const scoresLoading = ref(false)
    const editOpen = ref(false)
    let timerInterval: any = null
    let submitCheckTimer: any = null

    // race 在线用户：userId → boolean
    const raceOnlineMap = reactive<Record<number, boolean>>({})

    // ====================== pin 房间加入 ======================
    onMounted(() => {
        if (!canShow.value) return
        // 确保 ws 连接
        if (!wsConnected.value) {
            connect()
        }
        // 延迟加入 race 房间（等 ws 连接）
        const joinTimer = setTimeout(() => {
            if (pin.value && classId.value) {
                raceJoin(pin.value)
                // 发送在线信号
                sendRaceOnline(pin.value, user.value?.id || 0, user.value?.name || 'anonymous', true)
            }
        }, 500)
        // 持续尝试加入（最多 10 次）
        let retries = 0
        const retryInterval = setInterval(() => {
            if (wsConnected.value && pin.value && classId.value) {
                raceJoin(pin.value)
                sendRaceOnline(pin.value, user.value?.id || 0, user.value?.name || 'anonymous', true)
                retries = 999
            }
            retries++
            if (retries >= 10) clearInterval(retryInterval)
        }, 1000)
        onBeforeUnmount(() => {
            clearTimeout(joinTimer)
            clearInterval(retryInterval)
        })
    })

    // 监听 race 在线状态
    onRaceOnlineUpdate((data: any) => {
        raceOnlineMap[data.userId] = data.online
    })

    onRaceJoined((_data: any) => {
        // 加入成功
    })

    // ====================== 学生得分表 ======================
    const { students } = useClassUsers()

    const studentRows = computed(() => {
        const scoreMap = new Map(raceScores.value.map((s: any) => [s.userId, s]))
        return students.value.map((s: any) => ({
            id: s.id,
            name: s.name,
            preferName: s.preferName,
            rollNumber: s.rollNumber,
            username: s.username,
            avatarImg: s.avatarImg,
            score: scoreMap.get(s.id)?.score ?? 0,
            correctCount: scoreMap.get(s.id)?.correctCount ?? 0,
        })).sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
    })

    const scoreColumns = computed(() => [
        { id: 'score', header: t('race.score') },
        { id: 'correctCount', header: t('race.correct') },
    ])

    function getScoreClass(score: number) {
        if (!score || score <= 0) return 'text-gray-400'
        return 'text-green-600 dark:text-green-300'
    }

    // ====================== WebSocket 事件监听 ======================
    onRaceStart((data: any) => {
        if (data.raceCid !== raceId.value) return
        raceActive.value = true
        currentIndex.value = -1
        currentQuestionCid.value = 0
        studentAnswered.value = false
        raceScores.value = []
    })

    onRaceQuestion((data: any) => {
        if (data.raceCid !== raceId.value) return
        currentIndex.value = data.questionIndex
        currentQuestionCid.value = data.questionCid
        timeRemaining.value = data.timeLimit
        totalTime.value = data.timeLimit
        studentAnswered.value = false
        showPodium.value = false
        questionTop3.value = []

        // 启动倒计时（显式提交；到 0 自动提交当前答案）
        if (timerInterval) clearInterval(timerInterval)
        timerInterval = setInterval(() => {
            timeRemaining.value = Math.max(0, timeRemaining.value - 1)
            if (timeRemaining.value <= 0) {
                clearInterval(timerInterval)
                // 学生：时间到自动提交
                if (!isTeacher.value && !studentAnswered.value) {
                    submitStudentAnswer()
                }
            }
        }, 1000)
    })

    onRaceAnswerUpdate((_data: any) => {
        // 答题进度更新（可通过 scores 获取）
    })

    onRaceScores((data: any) => {
        if (data.raceCid !== raceId.value) return
        raceScores.value = data.scores || []
    })

    onRaceQuestionEnd((data: any) => {
        if (data.raceCid !== raceId.value) return
        currentQuestionCid.value = 0
        showPodium.value = true
        // 每题领奖台：耳 top3 展示用时
        questionTop3.value = (data.top3 || []).map((t: any) => ({ ...t, display: `${t.timeUsed}s` }))
        if (timerInterval) clearInterval(timerInterval)
        if (submitCheckTimer) clearInterval(submitCheckTimer)
    })

    onRaceEnd((data: any) => {
        if (data.raceCid !== raceId.value) return
        raceActive.value = false
        currentQuestionCid.value = 0
        raceScores.value = data.scores || data.leaderboard || []
        // 最终领奖台：按总得分展示
        questionTop3.value = (data.scores || data.leaderboard || []).slice(0, 3).map((s: any) => ({
            userId: s.userId,
            from: s.from,
            display: `${Number(s.score) || 0}${t('question.points')}`,
        }))
        showPodium.value = true
        if (timerInterval) clearInterval(timerInterval)
        if (submitCheckTimer) clearInterval(submitCheckTimer)
    })

    // ====================== 教师控制 ======================
    function startRace() {
        if (!pin.value) return
        sendRaceStart(pin.value, raceId.value, courseId.value, raceQuestions.value.length, race.value.gapTime, user.value?.name || 'teacher')
        raceActive.value = true
        currentIndex.value = -1
        currentQuestionCid.value = 0
        raceScores.value = []
        showPodium.value = false
        questionTop3.value = []
    }

    function nextQuestion() {
        if (!pin.value) return
        showPodium.value = false
        questionTop3.value = []
        currentIndex.value++
        if (currentIndex.value >= raceQuestions.value.length) {
            endRace()
            return
        }
        const qid = raceQuestions.value[currentIndex.value]
        currentQuestionCid.value = qid
        timeRemaining.value = race.value.gapTime
        totalTime.value = race.value.gapTime
        sendRaceQuestion(pin.value, raceId.value, qid, currentIndex.value, raceQuestions.value.length, race.value.gapTime)

        // 启动教师倒计时
        if (timerInterval) clearInterval(timerInterval)
        timerInterval = setInterval(() => {
            timeRemaining.value = Math.max(0, timeRemaining.value - 1)
        }, 1000)
    }

    function endQuestion() {
        if (!pin.value) return
        sendRaceQuestionEnd(pin.value, raceId.value)
        currentQuestionCid.value = 0
        showPodium.value = true
        if (timerInterval) clearInterval(timerInterval)
    }

    function endRace() {
        if (!pin.value) return
        sendRaceEnd(pin.value, raceId.value)
        raceActive.value = false
        currentQuestionCid.value = 0
        if (timerInterval) clearInterval(timerInterval)
    }

    // ====================== 学生答题 ======================
    async function submitStudentAnswer() {
        // 未登录时禁止提交
        if (!isLoggedIn.value) {
            toast.add({ title: t('common.loginRequired'), color: 'warning' })
            return
        }
        if (studentAnswered.value) return
        const comp = questionRef.value
        if (!comp) return
        const qData = comp.getQuestionData?.()
        if (!qData) return
        const record = qData.record ? [...qData.record] : []

        studentAnswered.value = true
        if (submitCheckTimer) clearInterval(submitCheckTimer)

        // 上报竞赛完成状态（参与答题即完成）
        chapterTask?.reportNodeDone('race', raceId.value, true)

        // 服务端判分（show 不下发答案，本地无法判定）；失败按答错处理不阻断流程
        let rate = 0
        let correct = false
        if (currentQuestionCid.value && effectiveCourseId.value) {
            try {
                const res = await cRequest('/api/questions/verify', {
                    method: 'POST',
                    body: {
                        course_id: effectiveCourseId.value,
                        question_cid: currentQuestionCid.value,
                        user_answer: record,
                    },
                })
                rate = Math.max(0, Math.min(1, Number(res?.rate) || 0))
                correct = !!res?.isCorrect
            } catch { /* 判分失败按 0 分 */ }
        }
        toast.add({
            title: correct ? t('question.correct') : t('question.wrong'),
            color: correct ? 'success' : 'error',
        })

        sendRaceAnswer(
            pin.value, raceId.value, currentQuestionCid.value,
            record, rate, correct, user.value?.name || 'anonymous', user.value?.id || 0
        )
        // 显示结果 UI（传入服务端判定的 rate）
        comp.showResult?.(rate)
    }

    // ====================== 工具函数 ======================
    function formatTime(seconds: number) {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }

    const timeProgress = computed(() => {
        if (!totalTime.value) return 0
        return (timeRemaining.value / totalTime.value) * 100
    })

    // 编辑保存回调：通知父组件（编辑器中会调用 updateAttributes）
    function onSaved(rc: any) {
        // 不再调用 refresh()：refresh 会触发 pending=true → loading 态闪烁，
        // 导致编辑按钮从 DOM 移除，modal 关闭时 Radix focus 回退到 body 造成文档滚动到顶部。
        // Object.assign 已用表单数据即时更新本地状态，无需重新拉取。
        if (race.value) {
            Object.assign(race.value, rc)
        }
        // 通知 index.vue（编辑器中会调用 updateAttributes 更新 content 属性）
        emit('saved', rc)
    }

    onBeforeUnmount(() => {
        if (timerInterval) clearInterval(timerInterval)
        if (submitCheckTimer) clearInterval(submitCheckTimer)
        // 发送离线信号
        if (pin.value && canShow.value) {
            sendRaceOnline(pin.value, user.value?.id || 0, user.value?.name || 'anonymous', false)
        }
    })

    const ctx = {
        t, canShow, placeholderText, pending, race, raceId, isTeacher, pin,
        editOpen, studentRows, scoresLoading, scoreColumns, getScoreClass,
        raceActive, raceQuestions, currentIndex, currentQuestionCid,
        timeRemaining, formatTime, timeProgress, showPodium, questionTop3,
        studentAnswered, questionRef, onSaved, startRace, nextQuestion,
        endQuestion, endRace, refresh,
        useRaceRenderContext
    }
    provide(RaceRenderKey, ctx)
    return ctx
}
