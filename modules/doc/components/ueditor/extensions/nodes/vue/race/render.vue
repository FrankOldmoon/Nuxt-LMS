<template>
    <!-- lms 未启用或未加入班级：显示占位 -->
    <div v-if="!canShow" class="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-center text-gray-400 text-sm">
        {{ placeholderText }}
    </div>
    <div v-else class="race-render w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 relative">
        <!-- 加载中 -->
        <div v-if="pending" class="flex items-center justify-center py-6 text-gray-400">
            <span>{{ $t('race.loading') }}</span>
        </div>

        <!-- 竞赛未找到 -->
        <div v-else-if="!race" class="text-center py-6 text-gray-400">
            {{ $t('race.notFound') }} (cid: {{ raceId }})
        </div>

        <template v-else>
            <!-- 竞赛标题 -->
            <div class="flex items-center gap-3 mb-3 pr-6">
                <span class="px-2 py-0.5 bg-red-50 dark:bg-red-800 text-red-600 dark:text-red-300 rounded text-xs font-medium">
                    {{ $t('race.label') }}
                </span>
                <span class="font-semibold text-gray-800 dark:text-gray-200">{{ race.name }}</span>
                <span v-if="raceId" class="text-xs text-gray-400">#{{ raceId }}</span>
                <div class="flex items-center gap-2 ml-auto">
                    <UButton v-if="isTeacher" icon="i-lucide-edit" variant="ghost" size="2xs"
                        class="opacity-50 hover:opacity-100 transition-opacity"
                        @click="editOpen = true" />
                    <UIcon name="i-lucide-key" class="size-3.5 text-gray-400" />
                    <span class="text-xs font-mono text-gray-400">{{ pin }}</span>
                </div>
            </div>

            <!-- ====== 顶部：学生得分表 ====== -->
            <div class="mb-4">
                <ClassUsersTable :rows="studentRows" :loading="scoresLoading"
                    :hide-actions="true" :hide-teachers="true" :hide-number="true"
                    :extra-columns="scoreColumns" :default-sort="[{ id: 'score', desc: true }]"
                    show-chart show-online>
                    <template #score-cell="{ row }">
                        <span class="text-sm font-bold" :class="getScoreClass(row.original.score)">
                            {{ row.original.score?.toFixed(1) ?? '0' }}
                        </span>
                    </template>
                    <template #correctCount-cell="{ row }">
                        <span class="text-xs">{{ row.original.correctCount ?? 0 }}</span>
                    </template>
                </ClassUsersTable>
            </div>

            <!-- ====== 教师控制按钮（仅教师，题目上方） ====== -->
            <div v-if="isTeacher && raceActive" class="flex items-center justify-between mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                <UButton color="error" variant="outline" size="sm" icon="i-lucide-flag"
                    :label="$t('race.end')" @click="endRace" />
                <div class="flex items-center gap-3">
                    <span class="text-xs text-gray-400">{{ Math.max(currentIndex + 1, 0) }} / {{ raceQuestions.length }}</span>
                </div>
                <UButton v-if="currentQuestionCid" color="error" variant="solid" size="lg" icon="i-lucide-stop-circle"
                    :label="$t('race.showResult')" @click="endQuestion" />
                <UButton v-else color="success" variant="solid" size="lg" icon="i-lucide-arrow-right"
                    :label="$t('race.next')" :disabled="currentIndex >= raceQuestions.length - 1" @click="nextQuestion" />
            </div>

            <!-- ====== 倒计时 ====== -->
            <div v-if="raceActive && currentQuestionCid" class="mb-4 space-y-1">
                <div class="flex items-center justify-between text-xs">
                    <span :class="timeRemaining <= 5 ? 'text-red-500 font-bold' : 'text-gray-500'">
                        <UIcon name="i-lucide-timer" class="size-3.5 inline mr-1" />
                        {{ formatTime(timeRemaining) }}
                    </span>
                    <span class="text-gray-400">
                        {{ $t('race.questionIndex', { n: Math.max(currentIndex + 1, 0), total: raceQuestions.length }) }}
                    </span>
                </div>
                <div class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-1000 ease-linear"
                        :class="timeRemaining <= 5 ? 'bg-red-500' : 'bg-primary'"
                        :style="{ width: timeProgress + '%' }" />
                </div>
            </div>

            <!-- ====== 题目区域（showPodium 时隐藏） ====== -->
            <div v-if="currentQuestionCid && !showPodium" class="mb-4">
                <component
                    ref="questionRef"
                    :is="QuestionRender"
                    :node="{ attrs: { type: 'question', content: String(currentQuestionCid) } }" />
            </div>

            <!-- ====== Podium：前三名（showPodium 时显示） ====== -->
            <div v-if="showPodium" class="mb-4 py-6">
                <h3 class="text-center text-lg font-bold mb-6">{{ raceActive ? $t('race.results') : $t('race.leaderboard') }}</h3>
                <div class="flex items-end justify-center gap-4">
                    <!-- 第2名 -->
                    <div v-if="questionTop3[1]" class="flex flex-col items-center" style="margin-bottom: 20px;">
                        <UAvatar :src="questionTop3[1].avatarImg" :alt="questionTop3[1].from" size="lg" :text="questionTop3[1].from?.charAt(0)" class="mb-2" />
                        <span class="text-sm font-medium mb-1">{{ questionTop3[1].from }}</span>
                        <span class="text-xs text-gray-400 mb-2">{{ questionTop3[1].timeUsed }}s</span>
                        <div class="w-20 rounded-t-lg flex items-center justify-center text-white font-bold text-2xl"
                            style="height: 80px; background: linear-gradient(to top, #9ca3af, #d1d5db);">
                            2
                        </div>
                    </div>
                    <!-- 第1名 -->
                    <div v-if="questionTop3[0]" class="flex flex-col items-center">
                        <UIcon name="i-lucide-crown" class="size-6 text-yellow-400 mb-1" />
                        <UAvatar :src="questionTop3[0].avatarImg" :alt="questionTop3[0].from" size="xl" :text="questionTop3[0].from?.charAt(0)" class="mb-2 ring-4 ring-yellow-400" />
                        <span class="text-sm font-bold mb-1">{{ questionTop3[0].from }}</span>
                        <span class="text-xs text-gray-400 mb-2">{{ questionTop3[0].timeUsed }}s</span>
                        <div class="w-24 rounded-t-lg flex items-center justify-center text-white font-bold text-3xl"
                            style="height: 120px; background: linear-gradient(to top, #f59e0b, #fbbf24);">
                            1
                        </div>
                    </div>
                    <!-- 第3名 -->
                    <div v-if="questionTop3[2]" class="flex flex-col items-center" style="margin-bottom: 40px;">
                        <UAvatar :src="questionTop3[2].avatarImg" :alt="questionTop3[2].from" size="md" :text="questionTop3[2].from?.charAt(0)" class="mb-2" />
                        <span class="text-sm font-medium mb-1">{{ questionTop3[2].from }}</span>
                        <span class="text-xs text-gray-400 mb-2">{{ questionTop3[2].timeUsed }}s</span>
                        <div class="w-16 rounded-t-lg flex items-center justify-center text-white font-bold text-xl"
                            style="height: 60px; background: linear-gradient(to top, #b45309, #d97706);">
                            3
                        </div>
                    </div>
                </div>
                <!-- 无人答对 -->
                <p v-if="!questionTop3.length" class="text-center text-sm text-gray-400 mt-4">{{ $t('race.noWinners') }}</p>
            </div>

            <!-- 未开始 -->
            <div v-if="!raceActive" class="flex flex-col items-center gap-3 py-6">
                <template v-if="isTeacher">
                    <UButton v-if="raceQuestions.length > 0" color="primary" size="lg" icon="i-lucide-play"
                        :label="$t('race.start')" @click="startRace" />
                    <p v-else class="text-sm text-gray-400">{{ $t('race.noQuestions') }}</p>
                </template>
                <template v-else>
                    <UIcon name="i-lucide-hourglass" class="size-8 text-gray-300 animate-pulse" />
                    <p class="text-sm text-gray-400">{{ $t('race.waiting') }}</p>
                </template>
            </div>

            <!-- 已提交提示（学生） -->
            <div v-if="!isTeacher && raceActive && studentAnswered && currentQuestionCid" class="flex items-center justify-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                <UIcon name="i-lucide-check" class="size-4 text-blue-500" />
                <span class="text-sm text-blue-600 dark:text-blue-300">{{ $t('race.submitted') }} - {{ $t('race.waitingNext') }}</span>
            </div>
        </template>

        <!-- 编辑弹窗 -->
        <Edit v-model="editOpen" :race-id="raceId" :race="race" @saved="onSaved" />
    </div>
</template>

<script setup>
import { reactive, ref, computed, watch, onMounted, onBeforeUnmount, provide } from 'vue'
import QuestionRender from '../../render/vue/question.vue'
import { computeCorrectRate, decryptAnswer } from '../../render/vue/question/shared.ts'
import Edit from './edit.vue'

const props = defineProps({
    node: Object,
})
const emit = defineEmits(['saved'])

const { t } = useI18n()
const { moduleLms } = useRuntimeConfig().public
const { editableCourseId, editableId } = useLayoutState()
const { hasRole, user } = useAuth()
const isLoggedIn = computed(() => !!user.value)
const toast = useToast()
const chapterTask = useChapterTask()
const { wsConnected, connect, raceJoin, onRaceJoined, sendRaceStart, onRaceStart, sendRaceQuestion, onRaceQuestion, sendRaceAnswer, onRaceAnswerUpdate, onRaceScores, sendRaceQuestionEnd, onRaceQuestionEnd, sendRaceEnd, onRaceEnd, sendRaceOnline, onRaceOnlineUpdate } = useWebSocket()

// 告知 question 组件当前在 race 中：显示提交按钮但不向后端提交
provide('inRace', true)

const raceId = computed(() => Number(props.node?.attrs?.content) || 0)
const isTeacher = computed(() => hasRole('teacher') || hasRole('admin'))
const classId = computed(() => user.value?.defaultClass?.id || user.value?.classId || 0)
const chapterId = computed(() => editableId.value || 0)
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
    name: '',
    gapTime: 30,
    point: 100,
    questionIds: [],
})

const apiUrl = computed(() => {
    if (!raceId.value || !editableCourseId.value) return ''
    return `/api/races/show?course_id=${editableCourseId.value}&cid=${raceId.value}`
})

const { data: fetchedRace, pending, refresh } = cRequest.use(apiUrl, {
    transform: (raw) => {
        if (!raw) return null
        return reactive({
            name: raw.name || '',
            gapTime: Number(raw.gapTime) || 30,
            point: Number(raw.point) || 100,
            questionIds: raw.questionIds || [],
        })
    },
})

const race = ref(defaultRace)
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
    return raw.map(item => typeof item === 'number' ? item : Number(item.id)).filter(Boolean)
})

// ====================== 状态变量 ======================
const raceActive = ref(false)
const currentIndex = ref(-1)
const currentQuestionCid = ref(0)
const timeRemaining = ref(0)
const totalTime = ref(0)
const studentAnswered = ref(false)
const questionRef = ref(null)
// 题目结果 podium：前三名
const questionTop3 = ref([])
const showPodium = ref(false)
const raceScores = ref([])
const scoresLoading = ref(false)
const editOpen = ref(false)
let timerInterval = null
let submitCheckTimer = null

// race 在线用户：userId → boolean
const raceOnlineMap = reactive({})

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
onRaceOnlineUpdate((data) => {
    raceOnlineMap[data.userId] = data.online
})

onRaceJoined((data) => {
    // 加入成功
})

// ====================== 学生得分表 ======================
const { students } = useClassUsers()

const studentRows = computed(() => {
    const scoreMap = new Map(raceScores.value.map(s => [s.userId, s]))
    return students.value.map(s => ({
        id: s.id,
        name: s.name,
        preferName: s.preferName,
        rollNumber: s.rollNumber,
        avatarImg: s.avatarImg,
        score: scoreMap.get(s.id)?.score ?? 0,
        correctCount: scoreMap.get(s.id)?.correctCount ?? 0,
    })).sort((a, b) => (b.score || 0) - (a.score || 0))
})

const scoreColumns = computed(() => [
    { id: 'score', header: t('race.score') },
    { id: 'correctCount', header: t('race.correct') },
])

function getScoreClass(score) {
    if (!score || score <= 0) return 'text-gray-400'
    return 'text-green-600 dark:text-green-300'
}

// ====================== WebSocket 事件监听 ======================
onRaceStart((data) => {
    if (data.raceCid !== raceId.value) return
    raceActive.value = true
    currentIndex.value = -1
    currentQuestionCid.value = 0
    studentAnswered.value = false
    raceScores.value = []
})

onRaceQuestion((data) => {
    if (data.raceCid !== raceId.value) return
    currentIndex.value = data.questionIndex
    currentQuestionCid.value = data.questionCid
    timeRemaining.value = data.timeLimit
    totalTime.value = data.timeLimit
    studentAnswered.value = false
    showPodium.value = false
    questionTop3.value = []

    // 启动倒计时
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

    // 学生：启动提交检测
    if (!isTeacher.value) {
        if (submitCheckTimer) clearInterval(submitCheckTimer)
        submitCheckTimer = setInterval(checkStudentSubmit, 500)
    }
})

onRaceAnswerUpdate((data) => {
    if (data.raceCid !== raceId.value) return
    // 答题进度更新（可通过 scores 获取）
})

onRaceScores((data) => {
    if (data.raceCid !== raceId.value) return
    raceScores.value = data.scores || []
})

onRaceQuestionEnd((data) => {
    if (data.raceCid !== raceId.value) return
    currentQuestionCid.value = 0
    showPodium.value = true
    questionTop3.value = data.top3 || []
    if (timerInterval) clearInterval(timerInterval)
    if (submitCheckTimer) clearInterval(submitCheckTimer)
})

onRaceEnd((data) => {
    if (data.raceCid !== raceId.value) return
    raceActive.value = false
    currentQuestionCid.value = 0
    raceScores.value = data.scores || data.leaderboard || []
    // 显示最终总得分前三名 podium
    questionTop3.value = (data.scores || data.leaderboard || []).slice(0, 3).map(s => ({
        userId: s.userId,
        from: s.from,
        timeUsed: `${s.correctCount || 0} ${t('race.correct')}`,
    }))
    showPodium.value = true
    if (timerInterval) clearInterval(timerInterval)
    if (submitCheckTimer) clearInterval(submitCheckTimer)
})

// ====================== 教师控制 ======================
function startRace() {
    if (!pin.value) return
    sendRaceStart(pin.value, raceId.value, editableCourseId.value, raceQuestions.value.length, race.value.gapTime, user.value?.name || 'teacher')
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
function checkStudentSubmit() {
    if (studentAnswered.value) return
    const comp = questionRef.value
    if (!comp) return
    // 检测 question 是否已提交（学生点了提交按钮）
    const qData = comp.getQuestionData?.()
    if (!qData) return
    // submitted 状态通过 question 组件的内部 ref 暴露
    // 通过检查 record 是否有值来判断是否已作答
    const record = qData.record
    if (Array.isArray(record) && record.length > 0) {
        submitStudentAnswer()
    }
}

function submitStudentAnswer() {
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
    // 确保 answer 已解密
    if (Array.isArray(qData.answer) && qData.answer.some((a) => typeof a === 'string' && a.startsWith('enc:'))) {
        qData.answer = decryptAnswer(qData.answer)
    }
    const rate = computeCorrectRate(qData)
    const correct = rate > 0
    const record = qData.record ? [...qData.record] : []

    studentAnswered.value = true
    if (submitCheckTimer) clearInterval(submitCheckTimer)

    // 上报竞赛完成状态（参与答题即完成）
    chapterTask?.reportNodeDone('race', raceId.value, true)

    sendRaceAnswer(
        pin.value, raceId.value, currentQuestionCid.value,
        record, rate, correct, user.value?.name || 'anonymous', user.value?.id || 0
    )
    // 显示结果 UI
    comp.showResult?.()
}

// ====================== 工具函数 ======================
function formatTime(seconds) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const timeProgress = computed(() => {
    if (!totalTime.value) return 0
    return (timeRemaining.value / totalTime.value) * 100
})

// 编辑保存回调：通知父组件（编辑器中会调用 updateAttributes）
function onSaved(rc) {
    // 不再调用 refresh()：refresh 会触发 pending=true → loading 态闪烁，
    // 导致编辑按钮从 DOM 移除，modal 关闭时 Radix focus 回退到 body 造成文档滚动到顶部。
    // Object.assign 已用表单数据即时更新本地状态，无需重新拉取。
    if (race.value) {
        Object.assign(race.value, rc)
    }
    // 通知 index.vue（编辑器中会调用 updateAttributes 更新 content 属性）
    emit('saved', rc)
}

// 暴露 refresh 和 data 给 index.vue 调用
defineExpose({ refresh, data: race })

onBeforeUnmount(() => {
    if (timerInterval) clearInterval(timerInterval)
    if (submitCheckTimer) clearInterval(submitCheckTimer)
    // 发送离线信号
    if (pin.value && canShow.value) {
        sendRaceOnline(pin.value, user.value?.id || 0, user.value?.name || 'anonymous', false)
    }
})
</script>

<style scoped>
.race-render {
    width: 100%;
}
</style>
