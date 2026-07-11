<template>
    <div class="w-full">
        <!-- 未配置视频：占位提示 -->
        <div v-if="!videoSrc"
            class="flex flex-col items-center justify-center py-12 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            <UIcon name="i-lucide-video" class="size-8 text-gray-300" />
            <p class="text-sm text-gray-400 mt-2">{{ $t('question.videoSelectHint') }}</p>
        </div>

        <!-- 视频播放器 -->
        <div v-else class="video-question w-full relative" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #000;">
            <!-- 视频本体 -->
            <video ref="videoEl" :src="videoSrc" controls preload="metadata"
                class="w-full block" style="max-height: 480px; background: #000;"
                @timeupdate="onTimeUpdate" @seeked="onTimeUpdate" @ended="onVideoEnded" @loadedmetadata="onLoadedMetadata" />

            <!-- 进度条：已观看比例 + 题目位置 -->
            <div v-if="subQuestions.length" class="relative h-2 bg-gray-200 dark:bg-gray-700">
                <!-- 已观看部分 -->
                <div class="absolute top-0 left-0 h-full bg-primary/40 transition-all"
                    :style="{ width: (watchedRatio * 100) + '%' }" />
                <!-- 题目位置标记 -->
                <div v-for="(q, idx) in subQuestions" :key="idx"
                    class="absolute top-0 h-full w-1.5 -translate-x-1/2 rounded-full transition-colors"
                    :class="subRecords[q.cid]?.correct ? 'bg-green-500' : (subRecords[q.cid] ? 'bg-red-500' : 'bg-amber-500')"
                    :style="{ left: pct(q.at) + '%' }"
                    :title="`${$t('courseData.questionLabel')} #${q.cid} @ ${formatTime(q.at)}`" />
            </div>

            <!-- 状态提示：已观看 X% + 已答对 X/Y -->
            <div v-if="subQuestions.length"
                class="flex items-center gap-3 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <span class="flex items-center gap-1">
                    <UIcon name="i-lucide-eye" class="size-3.5" />
                    {{ $t('question.videoWatched') }}: {{ Math.round(watchedRatio * 100) }}%
                </span>
                <span class="text-gray-300">|</span>
                <span class="flex items-center gap-1">
                    <UIcon name="i-lucide-circle-check" class="size-3.5" />
                    {{ $t('question.videoCorrect') }}: {{ correctSubCount }}/{{ subQuestions.length }}
                </span>
            </div>

            <!-- 题目弹出层 -->
            <Transition name="video-fade">
                <div v-if="activeQuestion" class="absolute inset-0 z-20 flex items-center justify-center p-4"
                    style="background: rgba(0, 0, 0, 0.72);">
                    <div
                        class="w-full max-w-2xl max-h-full overflow-auto bg-white dark:bg-gray-900 rounded-lg shadow-xl flex flex-col">
                        <!-- 弹出层头部 -->
                        <div
                            class="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                            <span class="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1">
                                <UIcon name="i-lucide-pause" class="size-4" />
                                {{ $t('question.videoPaused') }} ({{ formatTime(activeQuestion.at) }})
                            </span>
                            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="2xs" @click="dismissQuestion" />
                        </div>
                        <!-- 题目内容（复用 question 渲染组件，独立提交） -->
                        <div class="p-4 overflow-auto">
                            <QuestionRender :key="activeQuestion.cid"
                                :node="{ attrs: { type: 'question', content: String(activeQuestion.cid) } }"
                                @submitted="onSubQuestionSubmitted" />
                        </div>
                        <!-- 弹出层底部：继续观看 -->
                        <div
                            class="flex justify-end gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                            <p v-if="!activeSubCorrect" class="text-xs text-amber-500 mr-auto">
                                {{ $t('question.videoMustCorrect') }}
                            </p>
                            <UButton color="primary" icon="i-lucide-play" :label="$t('question.videoContinue')"
                                :disabled="!activeSubCorrect" @click="dismissQuestion" />
                        </div>
                    </div>
                </div>
            </Transition>
        </div>

        <!-- 整体状态指示（不在 quiz 模式下显示） -->
        <div v-if="!inQuiz && videoSrc" class="mt-3 flex items-center gap-2 text-sm">
            <UIcon v-if="allPassed" name="i-lucide-check-circle-2" class="size-4 text-green-500" />
            <UIcon v-else-if="watchedRatio >= 0.95" name="i-lucide-alert-circle" class="size-4 text-amber-500" />
            <UIcon v-else name="i-lucide-circle" class="size-4 text-gray-400" />
            <span :class="allPassed ? 'text-green-600' : 'text-gray-500'">
                {{ statusText }}
            </span>
        </div>
    </div>
</template>

<script setup>
import { computed, ref, reactive, watch, nextTick, onBeforeUnmount } from 'vue'
import QuestionRender from '../render.vue'

const props = defineProps({
    question: { type: Object, required: true },
    questionId: { type: Number, default: 0 },
    inQuiz: { type: Boolean, default: false },
})

const { t } = useI18n()
const submitted = inject('questionSubmitted')
const isCorrect = inject('questionIsCorrect')
const fromRecord = inject('questionFromRecord')
const { courseId, chapterId } = useLmsContext()
const chapterTask = useChapterTask()

// ── 配置解析 ──
const videoSrc = computed(() => {
    const opts = props.question?.options
    if (opts && typeof opts === 'object' && !Array.isArray(opts)) {
        return opts.src || ''
    }
    return ''
})

const subQuestions = computed(() => {
    const opts = props.question?.options
    if (!opts || typeof opts !== 'object' || Array.isArray(opts)) return []
    const qs = Array.isArray(opts.questions) ? opts.questions : []
    return qs
        .map(q => ({ cid: Number(q.cid) || 0, at: Number(q.at) || 0 }))
        .filter(q => q.cid > 0)
        .sort((a, b) => a.at - b.at)
})

// ── record 状态（watchedRatio + subRecords） ──
// record[0] 形式存储：{ watchedRatio: 0~1, subRecords: { cid: { correct: bool } } }
const record = computed(() => {
    const r = props.question?.record
    if (Array.isArray(r) && r.length > 0) return r[0] || {}
    return {}
})

const watchedRatio = ref(0)
const subRecords = reactive({})  // cid -> { correct: bool, submitted: bool }

// 从 record 初始化
watch(record, (rec) => {
    if (rec && typeof rec === 'object') {
        watchedRatio.value = Math.max(0, Math.min(1, Number(rec.watchedRatio) || 0))
        if (rec.subRecords && typeof rec.subRecords === 'object') {
            for (const [cid, st] of Object.entries(rec.subRecords)) {
                subRecords[Number(cid)] = { correct: !!st?.correct, submitted: true }
            }
        }
    }
}, { immediate: true, deep: true })

// 派生：已答对的子题数
const correctSubCount = computed(() => {
    return Object.values(subRecords).filter(s => s.correct).length
})

// 整体是否通过（同时满足：watchedRatio >= 0.95 + 所有子题答对）
const allPassed = computed(() => {
    return watchedRatio.value >= 0.95 && correctSubCount.value >= subQuestions.value.length && subQuestions.value.length > 0
})

const statusText = computed(() => {
    if (allPassed.value) return t('question.videoCompleted')
    if (watchedRatio.value < 0.95) return t('question.videoNeedWatchFull')
    return t('question.videoNeedAllCorrect')
})

// ── 视频播放控制 ──
const videoEl = ref(null)
const duration = ref(0)
const activeQuestion = ref(null)  // 当前弹出的题目
const activeSubCorrect = ref(false)  // 当前弹出题目是否答对
// 已触发的题目 cid 集合（用于回放时不再弹）
const triggered = reactive({})

function onLoadedMetadata() {
    duration.value = videoEl.value?.duration || 0
}

function onTimeUpdate() {
    const v = videoEl.value
    if (!v) return
    const t = v.currentTime
    // 更新 watchedRatio（取最大值，防止回退）
    if (duration.value > 0) {
        const ratio = Math.max(0, Math.min(1, t / duration.value))
        if (ratio > watchedRatio.value) watchedRatio.value = ratio
    }
    // 触发题目弹出
    if (!activeQuestion.value) {
        const next = subQuestions.value.find(q => !triggered[q.cid] && t >= q.at)
        if (next) triggerQuestion(next)
    }
}

function onVideoEnded() {
    // 视频结束时，确保 watchedRatio = 1
    if (duration.value > 0) {
        watchedRatio.value = 1
    }
    // 如果有子题未弹出，强制弹出
    if (!activeQuestion.value) {
        const next = subQuestions.value.find(q => !triggered[q.cid])
        if (next) triggerQuestion(next)
    }
}

function triggerQuestion(q) {
    triggered[q.cid] = true
    activeQuestion.value = q
    activeSubCorrect.value = false
    if (videoEl.value) videoEl.value.pause()
}

function dismissQuestion() {
    activeQuestion.value = null
    nextTick(() => {
        // 关闭后再次检查：若拖动跳过了多个题目时间点，依次弹出下一个
        if (!activeQuestion.value) {
            const v = videoEl.value
            if (v) {
                const next = subQuestions.value.find(q => !triggered[q.cid] && v.currentTime >= q.at)
                if (next) {
                    triggerQuestion(next)
                    return
                }
                // 没有新的题目需要弹出时，恢复播放
                v.play().catch(() => { /* 用户未交互时 play 可能被拒绝，忽略 */ })
            }
        }
    })
}

// 子题提交回调
function onSubQuestionSubmitted({ isCorrect: correct, questionId: qid }) {
    if (activeQuestion.value && activeQuestion.value.cid === qid) {
        activeSubCorrect.value = correct
        // 记录到 subRecords
        subRecords[qid] = { correct, submitted: true }
    }
}

// 父组件（render.vue）询问当前数据时返回
defineExpose({
    submit() {
        // 整体通过才计为正确
        const passed = allPassed.value
        if (passed) {
            // 上报题目完成状态（quiz 模式下由 quiz 统一上报）
            if (!props.inQuiz) {
                chapterTask?.reportNodeDone('question', props.questionId, true)
            }
        }
        // 设置 inject 的 submitted/isCorrect（用于显示结果 UI）
        if (submitted) submitted.value = true
        if (isCorrect) isCorrect.value = passed
        if (fromRecord) fromRecord.value = false

        // 提交到后端
        import('./shared.ts').then(({ submitQuestion }) => {
            submitQuestion({
                questionId: props.questionId,
                userAnswer: [passed ? 1 : 0],
                isCorrect: passed,
                correctRate: passed ? 1 : 0,
                courseId: courseId.value,
                chapterId: chapterId.value,
                point: props.question?.point,
            })
        })

        return { isCorrect: passed }
    },
    reset() {
        watchedRatio.value = 0
        Object.keys(subRecords).forEach(k => delete subRecords[Number(k)])
        Object.keys(triggered).forEach(k => delete triggered[Number(k)])
        activeQuestion.value = null
        activeSubCorrect.value = false
        if (videoEl.value) {
            videoEl.value.currentTime = 0
        }
    },
    get hasAnswer() {
        return allPassed.value || (watchedRatio.value >= 0.95 && correctSubCount.value > 0)
    },
    fillCorrectAnswer() {
        // 假装"通过"
        watchedRatio.value = 1
        for (const q of subQuestions.value) {
            subRecords[q.cid] = { correct: true, submitted: true }
            triggered[q.cid] = true
        }
    },
})

// ── 工具函数 ──
function pct(at) {
    if (!duration.value) return 0
    return Math.min(100, Math.max(0, (at / duration.value) * 100))
}

function formatTime(s) {
    if (s == null || isNaN(s) || s < 0) return '00:00'
    const sec = Math.floor(s)
    const m = Math.floor(sec / 60)
    const ss = sec % 60
    return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

onBeforeUnmount(() => {
    activeQuestion.value = null
})
</script>

<style scoped>
.video-question {
    width: 100%;
}

.video-fade-enter-active,
.video-fade-leave-active {
    transition: opacity 0.2s ease;
}

.video-fade-enter-from,
.video-fade-leave-to {
    opacity: 0;
}
</style>
