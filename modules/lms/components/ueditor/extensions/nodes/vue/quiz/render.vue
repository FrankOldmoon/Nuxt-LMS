<template>
    <div class="quiz-render w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 relative"
        @mouseenter.once="onHover">
        <!-- 加载中 -->
        <div v-if="pending" class="flex items-center justify-center py-6 text-gray-400">
            <span>{{ $t('quiz.loading') }}</span>
        </div>

        <!-- 测验未找到 -->
        <div v-else-if="!quiz" class="text-center py-6 text-gray-400">
            {{ $t('quiz.notFound') }} (cid: {{ quizId }})
        </div>

        <template v-else>
            <!-- 测验标题 + 信息 -->
            <div class="flex items-center gap-3 mb-3">
                <span
                    class="px-2 py-0.5 bg-amber-50 dark:bg-amber-800 text-amber-600 dark:text-amber-300 rounded text-xs font-medium">
                    {{ $t('quiz.label') }}
                </span>
                <span class="font-semibold text-gray-800 dark:text-gray-200">{{ quiz.name }}</span>
                <span v-if="quizId" class="text-xs text-gray-400">#{{ quizId }}</span>
                <div class="flex items-center gap-2 ml-auto">
                    <UButton v-if="isTeacher" icon="i-lucide-edit" variant="ghost" size="2xs"
                        class="opacity-50 hover:opacity-100 transition-opacity"
                        @click="editOpen = true" />
                    <UButton v-if="moduleLms && isTeacher" icon="i-heroicons-clipboard" variant="ghost" size="2xs"
                        class="opacity-50 hover:opacity-100 transition-opacity" @click="recordsOpen = true" />
                    <span class="text-xs text-gray-400">{{ quiz.point }}{{ $t('question.points') }}</span>
                </div>
            </div>

            <!-- 开始/结束时间提示 -->
            <div v-if="quiz.startAt || quiz.endAt" class="flex flex-wrap gap-3 mb-3 text-xs text-gray-500">
                <span v-if="quiz.startAt" class="flex items-center gap-1">
                    <UIcon name="i-lucide-calendar-start" class="size-3" />
                    {{ $t('quiz.startAt') }}: {{ formatDateTime(quiz.startAt) }}
                </span>
                <span v-if="quiz.endAt" class="flex items-center gap-1">
                    <UIcon name="i-lucide-calendar-end" class="size-3" />
                    {{ $t('quiz.endAt') }}: {{ formatDateTime(quiz.endAt) }}
                </span>
            </div>

            <!-- 测验内容 -->
            <div v-if="quiz.content" class="prose prose-sm dark:prose-invert max-w-none mb-3">
                <ueditorRender :json="quiz.content" />
            </div>

            <!-- 已提交记录 -->
            <div v-if="userRecord"
                class="mb-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md">
                <div class="flex items-center gap-2 mb-1">
                    <UIcon name="i-heroicons-check-circle" class="size-5 text-green-500" />
                    <span class="text-sm font-medium text-green-700 dark:text-green-300">
                        {{ $t('quiz.submitted') }}: {{ userRecord.score }} / {{ quiz.point }}{{ $t('question.points') }}
                    </span>
                </div>
                <div class="text-xs text-gray-500">{{ $t('quiz.submitCount', { n: userRecord.submitCount }) }}</div>
            </div>

            <!-- 未开始：显示开始按钮或等待提示 -->
            <div v-if="!started && !userRecord" class="flex flex-col items-center gap-3 py-6">
                <UButton v-if="canStart && quizQuestions.length > 0" color="primary" size="lg" icon="i-lucide-play"
                    :label="$t('quiz.start')" @click="startQuiz" />
                <p v-else-if="quizQuestions.length === 0" class="text-sm text-gray-400">{{ $t('quiz.noQuestions') }}</p>
                <p v-else class="text-sm text-gray-400">{{ notStartedReason }}</p>
            </div>

            <!-- 已提交且可重试：显示重新开始按钮 -->
            <div v-if="userRecord && canRetry && !started" class="flex justify-center py-4">
                <UButton color="primary" variant="outline" icon="i-lucide-rotate-ccw" :label="$t('quiz.retry')"
                    @click="startQuiz" />
            </div>

            <!-- 答题中 或 已提交（显示题目） -->
            <div v-if="started || userRecord" class="space-y-3">
                <!-- 进度条计时器 -->
                <div v-if="started" class="space-y-1">
                    <div class="flex items-center justify-between text-xs">
                        <span :class="remainingTime <= 30 ? 'text-red-500 font-bold' : 'text-gray-500'">
                            <UIcon name="i-lucide-timer" class="size-3.5 inline mr-1" />
                            {{ formatTime(remainingTime) }}
                        </span>
                        <span class="text-gray-400">{{ $t('quiz.timeRemaining') }}</span>
                    </div>
                    <!-- 原生进度条，从右往左递减 -->
                    <div class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div class="h-full rounded-full transition-all duration-1000 ease-linear"
                            :class="remainingTime <= 30 ? 'bg-red-500' : 'bg-primary'"
                            :style="{ width: timeProgress + '%' }" />
                    </div>
                </div>

                <!-- 左右布局：左题目选择器 + 右当前题目 -->
                <div class="flex gap-3" style="min-height: 300px;">
                    <!-- 左侧题目选择器 -->
                    <div class="w-12 shrink-0 flex flex-col gap-1">
                        <button v-for="(q, idx) in quizQuestions" :key="q.id"
                            class="w-10 h-10 rounded-lg border-2 flex items-center justify-center text-sm font-medium transition-all relative"
                            :class="getQuestionBtnClass(idx)" @click="switchQuestion(idx)">
                            {{ idx + 1 }}
                        </button>
                    </div>

                    <!-- 右侧当前题目（v-show 保持所有题目挂载，切换不重新加载） -->
                    <div class="flex-1 min-w-0 relative">
                        <div v-for="(q, idx) in quizQuestions" :key="q.id" v-show="currentIndex === idx"
                            :class="currentIndex === idx ? '' : 'pointer-events-none absolute inset-0 -z-10'">
                            <component :ref="(el) => { if (el) questionRefs[idx] = el }" :is="QuestionRender"
                            :node="{ attrs: { type: 'question', content: String(q.id) } }" :course-id="effectiveCourseId" :in-quiz="true" />
                        </div>
                    </div>
                </div>

                <!-- 底部提交按钮 + 导航 -->
                <div v-if="started"
                    class="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                    <UButton color="success" variant="solid" size="lg" icon="i-lucide-chevron-left"
                        :disabled="currentIndex <= 0" @click="switchQuestion(currentIndex - 1)" />
                    <div class="flex items-center gap-3">
                        <span class="text-xs text-gray-400">{{ answeredCount }} / {{ quizQuestions.length }}</span>
                        <UButton color="primary" size="sm" :loading="submitting" @click="confirmSubmit">
                            {{ $t('quiz.submit') }}
                        </UButton>
                    </div>
                    <UButton color="success" variant="solid" size="lg" icon="i-lucide-chevron-right"
                        :disabled="currentIndex >= quizQuestions.length - 1"
                        @click="switchQuestion(currentIndex + 1)" />
                </div>

                <!-- 提交确认弹窗 -->
                <UModal v-model:open="confirmOpen">
                    <template #content>
                        <div class="p-6 space-y-4">
                            <h3 class="text-lg font-semibold">{{ $t('quiz.confirmSubmitTitle') }}</h3>
                            <div class="space-y-2 text-sm">
                                <div class="flex justify-between">
                                    <span class="text-gray-500">{{ $t('quiz.answeredCount') }}:</span>
                                    <span class="font-medium">{{ answeredCount }} / {{ quizQuestions.length }}</span>
                                </div>
                                <p v-if="answeredCount < quizQuestions.length" class="text-xs text-orange-500">
                                    {{ $t('quiz.unansweredHint') }}
                                </p>
                            </div>
                            <div class="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                <UButton variant="soft" @click="confirmOpen = false">{{ $t('common.cancel') }}</UButton>
                                <UButton color="primary" :loading="submitting" @click="submitQuiz">{{ $t('quiz.submit')
                                    }}</UButton>
                            </div>
                        </div>
                    </template>
                </UModal>
            </div>

            <!-- 提交后结果 -->
            <div v-if="submitted && resultScore !== null" class="mt-4">
                <div class="p-4 rounded-lg"
                    :class="resultPassed ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'">
                    <div class="text-lg font-semibold"
                        :class="resultPassed ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'">
                        {{ resultScore }} / {{ quiz.point }}{{ $t('question.points') }}
                    </div>
                    <div class="text-sm text-gray-500 mt-1">
                        {{ resultPassed ? $t('quiz.passed') : $t('quiz.notPassed') }}
                    </div>
                </div>
            </div>
        </template>

        <!-- 记录弹窗（仅教师） -->
        <component v-if="moduleLms && isTeacher" :is="QuizRecordsModal" v-model="recordsOpen"
            :course-id="editableCourseId" :cid="quizId"
            :quiz-point="quiz.point || 100" :questions="quizQuestions" />

        <!-- 编辑弹窗 -->
        <Edit v-model="editOpen" :quiz-id="quizId" :quiz="quiz" @saved="onSaved" />
    </div>
</template>

<script setup>
import { reactive, ref, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import QuestionRender from '../question/render.vue'
import { computeCorrectRate, decryptAnswer } from '../question/render/shared.ts'
import Edit from './edit.vue'

const props = defineProps({
    node: Object,
})
const emit = defineEmits(['saved'])

const { t } = useI18n()
const { editableCourseId } = useLayoutState()
const { user, hasRole } = useAuth()
const isLoggedIn = computed(() => !!user.value)
const toast = useToast()
const { moduleLms } = useRuntimeConfig().public
const QuizRecordsModal = moduleLms ? resolveComponent('QuizRecordsModal') : null
const chapterTask = useChapterTask()

const quizId = computed(() => Number(props.node?.attrs?.content) || 0)
const isTeacher = computed(() => hasRole('teacher') || hasRole('admin'))

const editOpen = ref(false)
const recordsOpen = ref(false)

// 默认测验
const defaultQuiz = reactive({
    name: '',
    point: 100,
    timeLimit: 600,
    submitLimit: 1,
    questions: [],
    startAt: null,
    endAt: null,
    content: '',
})

const apiUrl = computed(() => {
    if (!quizId.value || !effectiveCourseId.value) return ''
    return `/api/quizzes/show?course_id=${effectiveCourseId.value}&cid=${quizId.value}`
})

const { data: fetchedQuiz, pending, refresh } = cRequest.use(apiUrl, {
    transform: (raw) => {
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

const quiz = ref(defaultQuiz)
watch([fetchedQuiz, quizId], () => {
    if (!quizId.value) {
        quiz.value = defaultQuiz
    } else if (fetchedQuiz.value) {
        quiz.value = fetchedQuiz.value
    }
}, { immediate: true, flush: 'sync' })

// 规范化 questions 为 [{id, point}] 格式
const quizQuestions = computed(() => {
    const raw = quiz.value?.questions
    if (!Array.isArray(raw)) return []
    return raw.map(item => {
        if (typeof item === 'number') return { id: item, point: 1 }
        if (item && typeof item === 'object') return { id: Number(item.id), point: Number(item.point) || 1 }
        return null
    }).filter(Boolean)
})

// ====================== 状态变量 ======================
const userRecord = ref(null)
const recordFetched = ref(false)
const started = ref(false)
const submitted = ref(false)
const submitting = ref(false)
const resultScore = ref(null)
const resultPassed = ref(false)
const confirmOpen = ref(false)
const currentIndex = ref(0)
const remainingTime = ref(0)
const totalTime = ref(0)
const questionRefs = []
const answeredSet = ref(new Set())
// 每题实时状态：{ [idx]: { record, rate, point, answered } }
const questionStates = reactive({})
let timerInterval = null

// 初始化 questionStates
watch(quizQuestions, (qs) => {
    qs.forEach((q, idx) => {
        if (!questionStates[idx]) {
            questionStates[idx] = { record: [], rate: 0, point: q.point, answered: false, correct: null }
        }
    })
}, { immediate: true })

// 从 questionRefs 同步状态到 questionStates（定时调用）
function syncQuestionStates() {
    quizQuestions.value.forEach((q, idx) => {
        const comp = questionRefs[idx]
        if (!comp) return
        const qData = comp.getQuestionData?.()
        if (!qData) return
        // 确保 answer 已解密
        if (Array.isArray(qData.answer) && qData.answer.some((a) => typeof a === 'string' && a.startsWith('enc:'))) {
            qData.answer = decryptAnswer(qData.answer)
        }
        const record = qData.record ? [...qData.record] : []
        const rate = computeCorrectRate(qData)
        const answered = !!(comp.hasAnswer || record.length > 0)
        questionStates[idx] = {
            record,
            rate,
            point: q.point,
            answered,
            correct: record.length > 0 ? rate > 0 : null,
        }
    })
}

// ====================== 用户记录 ======================

async function fetchRecord() {
    if (isTeacher.value) return
    if (!quizId.value || !effectiveCourseId.value) return
    try {
        const data = await cRequest(`/api/quizzes/record?course_id=${effectiveCourseId.value}&cid=${quizId.value}`)
        if (data) {
            // 判断是否是进行中状态：有 startedAt 但没有 submitedAt
            if (data.startedAt && !data.submitedAt) {
                // 进行中的 quiz，恢复计时
                const elapsed = Math.floor((Date.now() - new Date(data.startedAt).getTime()) / 1000)
                const limit = quiz.value.timeLimit || 600
                remainingTime.value = Math.max(0, limit - elapsed)
                totalTime.value = limit
                // 如果还有时间，恢复答题状态
                if (remainingTime.value > 0) {
                    started.value = true
                    submitted.value = false
                    resumeTimer()
                    // 填充已有答题记录
                    nextTick(() => {
                        if (Array.isArray(data.records)) {
                            fillRecordsToQuestions(data.records)
                        }
                    })
                } else {
                    // 时间已到，自动提交状态
                    userRecord.value = data
                }
            } else {
                // 已提交的记录
                userRecord.value = data
                // 如果有提交记录，填充到各 question
                nextTick(() => fillRecordsToQuestions(data.records))
            }
        }
    } catch (err) { /* 静默 */ }
    recordFetched.value = true
}

function onHover() {
    fetchRecord()
}

// 将 quiz record 填充到各 question 组件
function fillRecordsToQuestions(records) {
    if (!Array.isArray(records) || !records.length) return
    const recordsMap = new Map(records.map(r => [Number(r.questionCid), r]))
    quizQuestions.value.forEach((q, idx) => {
        const rec = recordsMap.get(q.id)
        if (!rec) return
        const comp = questionRefs[idx]
        if (comp?.fillFromRecord) {
            comp.fillFromRecord(rec.answer || [], rec.rate)
        }
        // 同步到 questionStates
        questionStates[idx] = {
            record: rec.answer || [],
            rate: rec.rate || 0,
            point: q.point,
            answered: true,
            correct: rec.rate > 0,
        }
    })
}

onMounted(() => {
    if (isTeacher.value) return
    fetchRecord()
    // 题目组件挂载后延迟同步状态（等 question 数据加载）
    const syncTimer = setInterval(() => {
        if (questionRefs.length > 0) {
            syncQuestionStates()
            updateAnsweredSet()
        }
    }, 500)
    // 30秒后停止（避免无限定时器）
    setTimeout(() => clearInterval(syncTimer), 30000)
})

// ====================== 答题状态 ======================
// 是否可以开始测验
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

// 是否可以重试
const canRetry = computed(() => {
    if (!userRecord.value) return false
    const submitLimit = quiz.value?.submitLimit || 1
    return (userRecord.value.submitCount || 0) < submitLimit
})

// 计时器进度
const timeProgress = computed(() => {
    if (!totalTime.value) return 0
    return (remainingTime.value / totalTime.value) * 100
})

// 已答题数
const answeredCount = computed(() => answeredSet.value.size)

function updateAnsweredSet() {
    syncQuestionStates()
    const newSet = new Set()
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
    // 清空 questionStates
    Object.keys(questionStates).forEach(key => {
        questionStates[key] = { record: [], rate: 0, point: quizQuestions.value[key]?.point || 1, answered: false, correct: null }
    })

    // 重置所有 question 组件
    nextTick(() => {
        questionRefs.forEach((comp) => {
            comp?.resetForQuiz?.()
        })
    })

    // 记录开始时间到后端（用于恢复）
    cRequest('/api/quizzes/submit', {
        method: 'POST',
        body: {
            course_id: editableCourseId.value,
            quiz_cid: quizId.value,
            records: [],
            start_only: true,
        },
    }).catch(() => { })

    resumeTimer()
}

// 恢复/启动倒计时
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

function formatTime(seconds) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatDateTime(d) {
    if (!d) return ''
    const date = new Date(d)
    const pad = (n) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// 收集所有题目的作答结果（从 questionStates 获取）
function collectAnswers() {
    // 显示各 question 结果 UI
    questionRefs.forEach((comp) => {
        comp?.showResult?.()
    })
    syncQuestionStates()
    return quizQuestions.value.map((q, idx) => {
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

// 题目按钮样式：当前选中/已答(橙)/已提交review对(绿)/错(红)/未答
function getQuestionBtnClass(idx) {
    const isCurrent = currentIndex.value === idx
    const s = questionStates[idx]
    // 已提交状态（review 模式）
    if (submitted.value || userRecord.value) {
        if (s?.correct === true) return isCurrent ? 'border-green-500 bg-green-500 text-white' : 'border-green-400 bg-green-50 dark:bg-green-900/30 text-green-600'
        if (s?.correct === false) return isCurrent ? 'border-red-500 bg-red-500 text-white' : 'border-red-400 bg-red-50 dark:bg-red-900/30 text-red-600'
    }
    // 答题中：已答橙色
    if (s?.answered) return isCurrent ? 'border-orange-500 bg-orange-500 text-white' : 'border-orange-400 bg-orange-50 dark:bg-orange-900/30 text-orange-600'
    // 未答
    return isCurrent
        ? 'border-primary bg-primary/10 text-primary'
        : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
}

// 切换题目，同时同步实时数据
function switchQuestion(idx) {
    if (idx < 0 || idx >= quizQuestions.length) return
    currentIndex.value = idx
    updateAnsweredSet()
}

async function submitQuiz() {
    // 未登录时禁止提交
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
                course_id: editableCourseId.value,
                quiz_cid: quizId.value,
                records,
            },
        })
        resultScore.value = result.score
        resultPassed.value = result.isPassed
        submitted.value = true
        started.value = false
        // 上报测验完成状态（通过即完成）
        chapterTask?.reportNodeDone('quiz', quizId.value, !!result.isPassed)
        await fetchRecord()
        useUserCard().refresh()
    } catch (err) {
        // 提交失败，恢复答题状态
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

// 编辑保存回调：通知父组件（编辑器中会调用 updateAttributes）
function onSaved(qz) {
    // 不再调用 refresh()：refresh 会触发 pending=true → loading 态闪烁，
    // 导致编辑按钮从 DOM 移除，modal 关闭时 Radix focus 回退到 body 造成文档滚动到顶部。
    // Object.assign 已用表单数据即时更新本地状态，无需重新拉取。
    if (quiz.value) {
        Object.assign(quiz.value, qz)
    }
    // 通知 index.vue（编辑器中会调用 updateAttributes 更新 content 属性）
    emit('saved', qz)
}

// 暴露 refresh 和 data 给 index.vue 调用
defineExpose({ refresh, data: quiz })

onBeforeUnmount(() => {
    if (timerInterval) clearInterval(timerInterval)
})
</script>

<style scoped>
.quiz-render {
    width: 100%;
}
</style>
