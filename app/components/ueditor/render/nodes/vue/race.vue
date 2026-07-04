<template>
    <div class="race-render w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 relative">
        <!-- 加载中 -->
        <div v-if="pending" class="flex items-center justify-center py-6 text-gray-400">
            <span>{{ $t('race.loading') }}</span>
        </div>

        <!-- 竞赛未找到 -->
        <div v-else-if="!race" class="text-center py-6 text-gray-400">
            {{ $t('race.notFound') }} (cid: {{ raceId }})
        </div>

        <template v-else>
            <!-- 右上角编辑按钮（仅教师） -->
            <div v-if="isTeacher" class="absolute top-2 right-2 flex items-center gap-1 z-10">
                <UButton icon="i-heroicons-pencil-square" variant="ghost" size="2xs"
                    class="opacity-50 hover:opacity-100 transition-opacity"
                    @click="editOpen = true" />
            </div>

            <!-- 竞赛标题 -->
            <div class="flex items-center gap-3 mb-3 pr-6">
                <span class="px-2 py-0.5 bg-red-50 dark:bg-red-800 text-red-600 dark:text-red-300 rounded text-xs font-medium">
                    {{ $t('race.label') }}
                </span>
                <span class="font-semibold text-gray-800 dark:text-gray-200">{{ race.name }}</span>
                <span v-if="raceId" class="text-xs text-gray-400">#{{ raceId }}</span>
            </div>

            <!-- 竞赛信息 -->
            <div class="flex flex-wrap gap-3 mb-4 text-xs text-gray-500">
                <span class="flex items-center gap-1">
                    <UIcon name="i-lucide-zap" class="size-3" />
                    {{ $t('race.gapTime') }}: {{ race.gapTime }}{{ $t('chapter.seconds') }}
                </span>
                <span class="flex items-center gap-1">
                    <UIcon name="i-lucide-list" class="size-3" />
                    {{ $t('race.questionCount', { n: (race.questionIds || []).length }) }}
                </span>
            </div>

            <!-- ====== 教师控制面板 ====== -->
            <div v-if="isTeacher && classId" class="space-y-4">
                <!-- 竞赛码 -->
                <div v-if="!raceActive" class="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                    <UIcon name="i-lucide-key" class="size-4 text-gray-400" />
                    <span class="text-sm text-gray-500">{{ $t('race.pin') }}:</span>
                    <span class="text-sm font-mono font-bold">{{ classId }}-{{ raceId }}</span>
                </div>

                <!-- 未开始 -->
                <div v-if="!raceActive" class="flex items-center gap-3">
                    <UButton color="primary" icon="i-lucide-play" :label="$t('race.start')" @click="startRace" />
                </div>

                <!-- 进行中 -->
                <div v-else class="space-y-3">
                    <!-- 进度 -->
                    <div class="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                        <span class="text-sm font-medium text-blue-700 dark:text-blue-300">
                            {{ $t('race.questionIndex', { n: Math.max(teacherCurrentIndex + 1, 0), total: (race.questionIds || []).length }) }}
                        </span>
                        <UButton v-if="!teacherQuestionActive && !questionResults.length" color="primary" size="sm" icon="i-lucide-send"
                            :label="$t('race.next')" @click="sendQuestion" />
                    </div>

                    <!-- 当前题目答题中 -->
                    <div v-if="teacherQuestionActive" class="p-3 bg-gray-50 dark:bg-gray-800 rounded space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="text-sm">{{ $t('race.answeredCount', { n: answeredCount }) }}</span>
                            <UButton color="error" size="sm" icon="i-lucide-stop-circle" :label="$t('race.showResult')" @click="endQuestion" />
                        </div>
                    </div>

                    <!-- 题目结果 -->
                    <div v-if="!teacherQuestionActive && questionResults.length" class="p-3 bg-gray-50 dark:bg-gray-800 rounded space-y-2">
                        <div class="text-sm font-medium mb-1">{{ $t('race.results') }}</div>
                        <div v-for="r in questionResults" :key="r.userId" class="flex items-center gap-2 text-xs">
                            <UIcon :name="r.correct ? 'i-lucide-check-circle' : 'i-lucide-x-circle'"
                                :class="r.correct ? 'text-green-500' : 'text-red-500'" class="size-4" />
                            <span class="flex-1">{{ r.from }}</span>
                            <span v-if="r.rate > 0" class="text-green-500">+{{ Math.round(r.rate * 100) }}%</span>
                        </div>
                        <UButton color="primary" size="sm" icon="i-lucide-arrow-right"
                            :label="$t('race.next')" @click="nextQuestion" :disabled="teacherCurrentIndex >= (race.questionIds || []).length - 1" />
                    </div>

                    <!-- 结束竞赛 -->
                    <UButton color="error" variant="outline" icon="i-lucide-flag" :label="$t('race.end')" @click="endRace" />

                    <!-- 排行榜 -->
                    <div v-if="finalLeaderboard.length" class="space-y-2">
                        <h4 class="text-sm font-semibold">{{ $t('race.leaderboard') }}</h4>
                        <div v-for="(u, idx) in finalLeaderboard" :key="u.userId" class="flex items-center gap-3 p-2 rounded"
                            :class="idx === 0 ? 'bg-yellow-50 dark:bg-yellow-900/20' : idx === 1 ? 'bg-gray-100 dark:bg-gray-800' : idx === 2 ? 'bg-orange-50 dark:bg-orange-900/20' : ''">
                            <span class="w-6 text-center font-bold" :class="idx < 3 ? 'text-lg' : 'text-sm text-gray-400'">{{ idx + 1 }}</span>
                            <span class="flex-1 text-sm">{{ u.from }}</span>
                            <span class="text-sm font-medium text-green-600">{{ u.score }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ====== 学生答题面板 ====== -->
            <div v-if="!isTeacher" class="space-y-4">
                <!-- 等待开始 -->
                <div v-if="!studentRaceActive" class="flex flex-col items-center gap-3 py-6">
                    <UIcon name="i-lucide-hourglass" class="size-8 text-gray-300 animate-pulse" />
                    <p class="text-sm text-gray-400">{{ $t('race.waiting') }}</p>
                </div>

                <!-- 答题中 -->
                <div v-else-if="!studentQuestionEnded" class="space-y-3">
                    <!-- 题目编号 + 计时 -->
                    <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                        <span class="text-sm font-medium">
                            {{ $t('race.questionIndex', { n: studentQuestionIndex + 1, total: studentTotalQuestions }) }}
                        </span>
                        <span v-if="studentTimeRemaining > 0" class="text-sm" :class="studentTimeRemaining <= 5 ? 'text-red-500 font-bold' : 'text-gray-500'">
                            {{ $t('race.timeRemaining') }}: {{ studentTimeRemaining }}{{ $t('chapter.seconds') }}
                        </span>
                    </div>

                    <!-- 渲染题目 -->
                    <div ref="questionContainer" class="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                        <component :is="VueRender" :node="{ attrs: { type: 'question', content: String(studentQuestionCid) } }" />
                    </div>

                    <!-- 已提交等待 -->
                    <div v-if="studentAnswered" class="flex items-center justify-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                        <UIcon name="i-lucide-check" class="size-4 text-blue-500" />
                        <span class="text-sm text-blue-600 dark:text-blue-300">{{ $t('race.submitted') }} - {{ $t('race.waitingNext') }}</span>
                    </div>
                </div>

                <!-- 题目结束，显示结果 -->
                <div v-else-if="!studentRaceFinished" class="space-y-3">
                    <div class="p-4 rounded-lg" :class="studentLastCorrect ? 'bg-green-50 dark:bg-green-900/20 border border-green-200' : 'bg-red-50 dark:bg-red-900/20 border border-red-200'">
                        <div class="flex items-center gap-2">
                            <UIcon :name="studentLastCorrect ? 'i-lucide-check-circle' : 'i-lucide-x-circle'"
                                :class="studentLastCorrect ? 'text-green-500' : 'text-red-500'" class="size-6" />
                            <span class="text-lg font-medium" :class="studentLastCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'">
                                {{ studentLastCorrect ? $t('race.correct') : $t('race.wrong') }}
                            </span>
                        </div>
                    </div>
                    <div class="flex items-center justify-center p-3 text-gray-400 text-sm">
                        <UIcon name="i-lucide-loader-2" class="size-4 animate-spin mr-2" />
                        {{ $t('race.waitingNext') }}
                    </div>
                </div>

                <!-- 竞赛结束，显示排行榜 -->
                <div v-else class="space-y-3">
                    <h4 class="text-center text-lg font-semibold">{{ $t('race.finished') }}</h4>
                    <div class="space-y-2">
                        <div v-for="(u, idx) in studentLeaderboard" :key="u.userId" class="flex items-center gap-3 p-2 rounded"
                            :class="idx === 0 ? 'bg-yellow-50 dark:bg-yellow-900/20' : idx === 1 ? 'bg-gray-100 dark:bg-gray-800' : idx === 2 ? 'bg-orange-50 dark:bg-orange-900/20' : ''">
                            <span class="w-6 text-center font-bold" :class="idx < 3 ? 'text-lg' : 'text-sm text-gray-400'">{{ idx + 1 }}</span>
                            <span class="flex-1 text-sm">{{ u.from }}</span>
                            <span class="text-sm font-medium text-green-600">{{ u.score }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 无班级提示 -->
            <div v-if="!classId" class="text-center py-4 text-sm text-gray-400">
                {{ $t('chapter.noClass') }}
            </div>
        </template>

        <!-- 编辑弹窗 -->
        <RaceEdit v-model="editOpen" :race-id="raceId" :race="race" @saved="onSaved" />
    </div>
</template>

<script setup>
import { reactive, ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import RaceEdit from '../../../extensions/nodes/vue/race/edit.vue'
import VueRender from './index.vue'

const props = defineProps({
    node: Object,
})

const emit = defineEmits(['init'])

const { t } = useI18n()
const { editableCourseId } = useLayoutState()
const { hasRole, user } = useAuth()
const { wsConnected, joinClass } = useWebSocket()

const raceId = computed(() => Number(props.node?.attrs?.content) || 0)
const isTeacher = computed(() => hasRole('teacher') || hasRole('admin'))
const classId = computed(() => user.value?.defaultClass?.id || user.value?.classId || 0)

const editOpen = ref(false)

// 默认竞赛
const defaultRace = reactive({
    name: '',
    gapTime: 30,
    point: 100,
    questionIds: [],
})

const apiUrl = computed(() => {
    if (!raceId.value || !editableCourseId.value) return ''
    return `/api/lms/races/show?course_id=${editableCourseId.value}&cid=${raceId.value}`
})

const { data: fetchedRace, pending, refresh } = cRequest.use(apiUrl, {
    transform: (raw) => {
        if (!raw) return null
        return reactive({
            name: raw.name || '',
            gapTime: Number(raw.gapTime) || 30,
            point: Number(raw.point) || 100,
            questionIds: Array.isArray(raw.questionIds) ? [...raw.questionIds] : [],
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

// ====================== 教师状态 ======================
const raceActive = ref(false)
const teacherCurrentIndex = ref(-1)
const teacherQuestionActive = ref(false)
const answeredCount = ref(0)
const questionResults = ref([])
const finalLeaderboard = ref([])

const {
    sendRaceStart, onRaceStart,
    sendRaceQuestion, onRaceQuestion,
    sendRaceQuestionEnd, onRaceAnswerUpdate, onRaceQuestionEnd,
    sendRaceEnd, onRaceEnd,
} = useWebSocket()

function startRace() {
    if (!classId.value) return
    const totalQuestions = (race.value.questionIds || []).length
    sendRaceStart(classId.value, raceId.value, editableCourseId.value, totalQuestions, race.value.gapTime, user.value?.name || 'teacher')
    raceActive.value = true
    teacherCurrentIndex.value = -1
}

function sendQuestion() {
    if (!classId.value) return
    teacherCurrentIndex.value++
    const qids = race.value.questionIds || []
    if (teacherCurrentIndex.value >= qids.length) {
        endRace()
        return
    }
    const qid = qids[teacherCurrentIndex.value]
    teacherQuestionActive.value = true
    answeredCount.value = 0
    questionResults.value = []
    // 发送题目信号（学生端自行加载题目数据）
    sendRaceQuestion(
        classId.value, raceId.value, '', qid,
        teacherCurrentIndex.value, qids.length, race.value.gapTime, [], 'single'
    )
    // 更新 classRaces 状态
    cRequest('/api/lms/races/state', {
        method: 'POST',
        body: {
            class_id: classId.value,
            course_id: editableCourseId.value,
            race_cid: raceId.value,
            current_index: teacherCurrentIndex.value,
            last_question_started_at: new Date().toISOString(),
        }
    }).catch(() => {})
}

function endQuestion() {
    if (!classId.value) return
    // 获取正确答案发送给学生
    const qid = (race.value.questionIds || [])[teacherCurrentIndex.value]
    sendRaceQuestionEnd(classId.value, raceId.value, [])
    teacherQuestionActive.value = false
    // results 会通过 onRaceQuestionEnd 回调更新
}

function nextQuestion() {
    questionResults.value = []
    answeredCount.value = 0
    const qids = race.value.questionIds || []
    if (teacherCurrentIndex.value >= qids.length - 1) {
        endRace()
    } else {
        sendQuestion()
    }
}

function endRace() {
    if (!classId.value) return
    sendRaceEnd(classId.value, raceId.value)
    raceActive.value = false
    teacherCurrentIndex.value = -1
    teacherQuestionActive.value = false
}

// 教师监听答题进度和结果
onRaceAnswerUpdate((data) => {
    if (data.raceCid === raceId.value) {
        answeredCount.value = data.answeredCount
    }
})

onRaceQuestionEnd((data) => {
    if (data.raceCid === raceId.value) {
        questionResults.value = data.results || []
    }
})

onRaceEnd((data) => {
    if (data.raceCid === raceId.value) {
        finalLeaderboard.value = data.leaderboard || []
    }
})

// ====================== 学生状态 ======================
const studentRaceActive = ref(false)
const studentQuestionCid = ref(0)
const studentQuestionIndex = ref(0)
const studentTotalQuestions = ref(0)
const studentTimeRemaining = ref(0)
const studentAnswered = ref(false)
const studentQuestionEnded = ref(false)
const studentLastCorrect = ref(false)
const studentRaceFinished = ref(false)
const studentLeaderboard = ref([])
const questionContainer = ref(null)
let studentTimer = null
let submitCheckTimer = null

onRaceStart((data) => {
    if (data.raceCid === raceId.value) {
        studentRaceActive.value = true
        studentRaceFinished.value = false
        studentTotalQuestions.value = data.totalQuestions
    }
})

onRaceQuestion((data) => {
    if (data.raceCid === raceId.value) {
        studentQuestionCid.value = data.questionCid
        studentQuestionIndex.value = data.questionIndex
        studentTimeRemaining.value = data.timeLimit
        studentAnswered.value = false
        studentQuestionEnded.value = false

        // 启动倒计时
        if (studentTimer) clearInterval(studentTimer)
        studentTimer = setInterval(() => {
            studentTimeRemaining.value = Math.max(0, studentTimeRemaining.value - 1)
        }, 1000)

        // 启动提交检测（检测 question render 组件的提交状态）
        if (submitCheckTimer) clearInterval(submitCheckTimer)
        submitCheckTimer = setInterval(checkStudentSubmit, 500)
    }
})

onRaceQuestionEnd((data) => {
    if (data.raceCid === raceId.value) {
        studentQuestionEnded.value = true
        if (studentTimer) clearInterval(studentTimer)
        if (submitCheckTimer) clearInterval(submitCheckTimer)
        // 从结果中找到自己的
        const myResult = (data.results || []).find((r) => r.userId === user.value?.id)
        studentLastCorrect.value = myResult?.correct || false
    }
})

onRaceEnd((data) => {
    if (data.raceCid === raceId.value) {
        studentRaceFinished.value = true
        studentRaceActive.value = false
        studentLeaderboard.value = data.leaderboard || []
        if (studentTimer) clearInterval(studentTimer)
        if (submitCheckTimer) clearInterval(submitCheckTimer)
    }
})

// 检测学生是否已提交答案（通过 DOM 查找 ResultBanner）
function checkStudentSubmit() {
    if (studentAnswered.value) return
    const container = questionContainer.value
    if (!container) return
    // ResultBanner: bg-green-50 (correct) 或 bg-red-50 (wrong)，含 ✓ 或 ✗
    const greenBanner = container.querySelector('[class*="bg-green-50"]')
    const redBanner = container.querySelector('[class*="bg-red-50"]')
    if (greenBanner || redBanner) {
        studentAnswered.value = true
        if (submitCheckTimer) clearInterval(submitCheckTimer)

        const correct = !!greenBanner
        const rate = correct ? 1 : 0

        // 发送答题结果
        const { sendRaceAnswer } = useWebSocket()
        sendRaceAnswer(
            classId.value, raceId.value, studentQuestionCid.value,
            [], rate, correct, user.value?.name || 'anonymous', user.value?.id || 0
        )
    }
}

function onSaved(r) {
    if (r.cid && Number(r.cid) !== raceId.value) {
        emit('init', r.cid)
    } else {
        refresh()
    }
    if (race.value) {
        Object.assign(race.value, r)
    }
}

onBeforeUnmount(() => {
    if (studentTimer) clearInterval(studentTimer)
    if (submitCheckTimer) clearInterval(submitCheckTimer)
})
</script>

<style scoped>
.race-render {
    width: 100%;
}
</style>
