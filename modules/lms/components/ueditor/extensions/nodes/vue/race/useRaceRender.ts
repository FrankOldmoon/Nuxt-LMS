import { reactive, ref, computed, watch, onMounted, onBeforeUnmount, provide, inject, type InjectionKey } from 'vue'
import { computeCorrectRate, decryptAnswer } from '../question/render/shared'

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

    // inform question ComponentCurrent race Middle：ShowSubmit ButtonbutnotoBackserverSubmit
    provide('inRace', true)

    const raceId = computed(() => Number(props.node?.attrs?.content) || 0)
    const isTeacher = computed(() => hasRole('teacher') || hasRole('admin'))
    const classId = computed(() => user.value?.defaultClass?.id || user.value?.classId || 0)
    // pin = classId_chapterId
    const pin = computed(() => `${classId.value}_${chapterId.value}`)

    // lms notEnableornotJoin Classnot whenShow
    const canShow = computed(() => !!moduleLms && !!classId.value)
    const placeholderText = computed(() => {
        if (!moduleLms) return t('race.needLms')
        if (!classId.value) return t('chatroom.needClass')
        return ''
    })

    // DefaultCompetition
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

    // normalize questionIds countWord Countgroup
    const raceQuestions = computed(() => {
        const raw = race.value?.questionIds
        if (!Array.isArray(raw)) return []
        return raw.map((item: any) => typeof item === 'number' ? item : Number(item.id)).filter(Boolean)
    })

    // ====================== StatusVariable ======================
    const raceActive = ref(false)
    const currentIndex = ref(-1)
    const currentQuestionCid = ref(0)
    const timeRemaining = ref(0)
    const totalTime = ref(0)
    const studentAnswered = ref(false)
    const questionRef = ref<any>(null)
    // Questionresult podium：Fronttop three
    const questionTop3 = ref<any[]>([])
    const showPodium = ref(false)
    const raceScores = ref<any[]>([])
    const scoresLoading = ref(false)
    const editOpen = ref(false)
    let timerInterval: any = null
    let submitCheckTimer: any = null

    // race LineUser：userId → boolean
    const raceOnlineMap = reactive<Record<number, boolean>>({})

    // ====================== pin roombetweenJoin ======================
    onMounted(() => {
        if (!canShow.value) return
        // ensure ws Connection
        if (!wsConnected.value) {
            connect()
        }
        // delayJoin race roombetween（etc. ws Connection）
        const joinTimer = setTimeout(() => {
            if (pin.value && classId.value) {
                raceJoin(pin.value)
                // SendLinesignal
                sendRaceOnline(pin.value, user.value?.id || 0, user.value?.name || 'anonymous', true)
            }
        }, 500)
        // keep tryingJoin（At most 10 times）
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

    // listen race LineStatus
    onRaceOnlineUpdate((data: any) => {
        raceOnlineMap[data.userId] = data.online
    })

    onRaceJoined((_data: any) => {
        // Join Successful
    })

    // ====================== StudentScoretable ======================
    const { students } = useClassUsers()

    const studentRows = computed(() => {
        const scoreMap = new Map(raceScores.value.map((s: any) => [s.userId, s]))
        return students.value.map((s: any) => ({
            id: s.id,
            name: s.name,
            preferName: s.preferName,
            rollNumber: s.rollNumber,
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

    // ====================== WebSocket Eventlisten ======================
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

        // StartCountdown
        if (timerInterval) clearInterval(timerInterval)
        timerInterval = setInterval(() => {
            timeRemaining.value = Math.max(0, timeRemaining.value - 1)
            if (timeRemaining.value <= 0) {
                clearInterval(timerInterval)
                // Student：TimetoAutoSubmit
                if (!isTeacher.value && !studentAnswered.value) {
                    submitStudentAnswer()
                }
            }
        }, 1000)

        // Student：StartSubmitdetect
        if (!isTeacher.value) {
            if (submitCheckTimer) clearInterval(submitCheckTimer)
            submitCheckTimer = setInterval(checkStudentSubmit, 500)
        }
    })

    onRaceAnswerUpdate((_data: any) => {
        // answer questionProgressUpdate（canPass scores Get）
    })

    onRaceScores((data: any) => {
        if (data.raceCid !== raceId.value) return
        raceScores.value = data.scores || []
    })

    onRaceQuestionEnd((data: any) => {
        if (data.raceCid !== raceId.value) return
        currentQuestionCid.value = 0
        showPodium.value = true
        questionTop3.value = data.top3 || []
        if (timerInterval) clearInterval(timerInterval)
        if (submitCheckTimer) clearInterval(submitCheckTimer)
    })

    onRaceEnd((data: any) => {
        if (data.raceCid !== raceId.value) return
        raceActive.value = false
        currentQuestionCid.value = 0
        raceScores.value = data.scores || data.leaderboard || []
        // ShowmostEndtotalScoreFronttop three podium
        questionTop3.value = (data.scores || data.leaderboard || []).slice(0, 3).map((s: any) => ({
            userId: s.userId,
            from: s.from,
            timeUsed: `${s.correctCount || 0} ${t('race.correct')}`,
        }))
        showPodium.value = true
        if (timerInterval) clearInterval(timerInterval)
        if (submitCheckTimer) clearInterval(submitCheckTimer)
    })

    // ====================== Teachercontrol ======================
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

        // StartTeacherCountdown
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

    // ====================== Studentanswer question ======================
    function checkStudentSubmit() {
        if (studentAnswered.value) return
        const comp = questionRef.value
        if (!comp) return
        // detect question YesNoalreadySubmit（StudentPointSubmit Button）
        const qData = comp.getQuestionData?.()
        if (!qData) return
        // submitted StatusPass question ComponentInside ref expose
        // Passcheck record YesNoHasValueto judgeYesNoalreadyanswer
        const record = qData.record
        if (Array.isArray(record) && record.length > 0) {
            submitStudentAnswer()
        }
    }

    function submitStudentAnswer() {
        // Not Logged InwhenForbidSubmit
        if (!isLoggedIn.value) {
            toast.add({ title: t('common.loginRequired'), color: 'warning' })
            return
        }
        if (studentAnswered.value) return
        const comp = questionRef.value
        if (!comp) return
        const qData = comp.getQuestionData?.()
        if (!qData) return
        // ensure answer alreadyDecrypt
        if (Array.isArray(qData.answer) && qData.answer.some((a: any) => typeof a === 'string' && a.startsWith('enc:'))) {
            qData.answer = decryptAnswer(qData.answer)
        }
        const rate = computeCorrectRate(qData)
        const correct = rate > 0
        const record = qData.record ? [...qData.record] : []

        studentAnswered.value = true
        if (submitCheckTimer) clearInterval(submitCheckTimer)

        // UpreportCompetitionCompleteStatus（participateandanswer questionthat isComplete）
        chapterTask?.reportNodeDone('race', raceId.value, true)

        sendRaceAnswer(
            pin.value, raceId.value, currentQuestionCid.value,
            record, rate, correct, user.value?.name || 'anonymous', user.value?.id || 0
        )
        // Showresult UI
        comp.showResult?.()
    }

    // ====================== toolFunction ======================
    function formatTime(seconds: number) {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }

    const timeProgress = computed(() => {
        if (!totalTime.value) return 0
        return (timeRemaining.value / totalTime.value) * 100
    })

    // EditSaveCallback：NotificationParent Component（EditeditorMiddlewillCall updateAttributes）
    function onSaved(rc: any) {
        // nothenCall refresh()：refresh willTrigger pending=true → loading state flicker，
        // causeEdit Buttonfrom DOM Remove，modal Closewhen Radix focus fallbackto body causeDocumentscrolltoTop。
        // Object.assign alreadyuseForm Datathat iswhenUpdatelocalGroundStatus，NoneneedHeavyNewfetch。
        if (race.value) {
            Object.assign(race.value, rc)
        }
        // Notification index.vue（EditeditorMiddlewillCall updateAttributes Update content Property）
        emit('saved', rc)
    }

    onBeforeUnmount(() => {
        if (timerInterval) clearInterval(timerInterval)
        if (submitCheckTimer) clearInterval(submitCheckTimer)
        // SendleaveLinesignal
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
