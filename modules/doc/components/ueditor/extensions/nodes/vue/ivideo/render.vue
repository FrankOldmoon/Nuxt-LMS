<template>
    <!-- 未配置视频：占位提示 -->
    <div v-if="!config.src"
        class="flex flex-col items-center justify-center py-12 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
        <UIcon name="i-lucide-video" class="size-8 text-gray-300" />
        <p class="text-sm text-gray-400 mt-2">{{ $t('ueditor.ivideoSelectHint') }}</p>
    </div>

    <!-- 互动视频播放器 -->
    <div v-else class="ivideo-render w-full relative" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #000;">
        <!-- 视频本体 -->
        <video ref="videoEl" :src="config.src" controls preload="metadata"
            class="w-full block" style="max-height: 480px; background: #000;"
            @timeupdate="checkAndTrigger" @seeked="checkAndTrigger" @loadedmetadata="onLoadedMetadata" />

        <!-- 时间轴标记：展示每个题目的弹出位置 -->
        <div v-if="questions.length" class="relative h-1.5 bg-gray-200 dark:bg-gray-700">
            <div v-for="(q, idx) in questions" :key="idx"
                class="absolute top-0 h-full w-1.5 -translate-x-1/2 rounded-full transition-colors"
                :class="triggered[q.cid] ? 'bg-green-500' : 'bg-amber-500'"
                :style="{ left: pct(q.at) + '%' }"
                :title="`${$t('courseData.questionLabel')} #${q.cid} @ ${formatTime(q.at)}`" />
        </div>

        <!-- 题目弹出层 -->
        <Transition name="ivideo-fade">
            <div v-if="activeQuestion" class="absolute inset-0 z-20 flex items-center justify-center p-4"
                style="background: rgba(0, 0, 0, 0.72);">
                <div
                    class="w-full max-w-2xl max-h-full overflow-auto bg-white dark:bg-gray-900 rounded-lg shadow-xl flex flex-col">
                    <!-- 弹出层头部 -->
                    <div
                        class="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                        <span class="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1">
                            <UIcon name="i-lucide-pause" class="size-4" />
                            {{ $t('ueditor.ivideoPaused') }} ({{ formatTime(activeQuestion.at) }})
                        </span>
                        <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="2xs" @click="dismissQuestion" />
                    </div>
                    <!-- 题目内容（复用 question 渲染组件，独立提交） -->
                    <div class="p-4 overflow-auto">
                        <QuestionRender :key="activeQuestion.cid"
                            :node="{ attrs: { type: 'question', content: String(activeQuestion.cid) } }"
                            @submitted="onQuestionSubmitted" />
                    </div>
                    <!-- 弹出层底部：继续观看 -->
                    <div
                        class="flex justify-end gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                        <p v-if="!questionCorrect" class="text-xs text-amber-500 mr-auto">
                            {{ $t('ueditor.ivideoMustCorrect') }}
                        </p>
                        <UButton color="primary" icon="i-lucide-play" :label="$t('ueditor.ivideoContinue')"
                            :disabled="!questionCorrect" @click="dismissQuestion" />
                    </div>
                </div>
            </div>
        </Transition>
    </div>
</template>

<script setup>
import { reactive, ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import QuestionRender from '../../render/vue/question.vue'

const props = defineProps({
    node: Object,
})

// 解析节点配置
const config = computed(() => {
    try {
        const raw = props.node?.attrs?.content
        if (raw) return JSON.parse(raw)
    } catch (_) { /* noop */ }
    return { src: '', questions: [] }
})

// 题目按时间升序排列
const questions = computed(() => {
    const raw = config.value?.questions
    if (!Array.isArray(raw)) return []
    return raw
        .map(q => ({ cid: Number(q.cid) || 0, at: Number(q.at) || 0 }))
        .filter(q => q.cid > 0)
        .sort((a, b) => a.at - b.at)
})

const videoEl = ref(null)
const duration = ref(0)
// 已触发的题目（按 cid 记录），避免回放/拖动时重复弹出
const triggered = reactive({})
// 当前弹出的题目
const activeQuestion = ref(null)
// 当前题目是否答对（用于控制继续观看按钮）
const questionCorrect = ref(false)

// 监听题目提交结果
function onQuestionSubmitted({ isCorrect, questionId }) {
    // 只处理当前活跃的题目
    if (activeQuestion.value && activeQuestion.value.cid === questionId) {
        questionCorrect.value = isCorrect
    }
}

// 切换题目时重置状态
watch(activeQuestion, (q) => {
    if (q) {
        // 新题目弹出时，重置为未答对状态
        questionCorrect.value = false
    }
})

function onLoadedMetadata() {
    duration.value = videoEl.value?.duration || 0
}

// 检查并触发到达时间点的题目（每次 timeupdate / seeked 调用）
function checkAndTrigger() {
    const v = videoEl.value
    if (!v || activeQuestion.value) return
    const t = v.currentTime
    // 找到最早一个尚未触发且时间已到的题目
    const next = questions.value.find(q => !triggered[q.cid] && t >= q.at)
    if (next) {
        triggerQuestion(next)
    }
}

function triggerQuestion(q) {
    triggered[q.cid] = true
    activeQuestion.value = q
    if (videoEl.value) videoEl.value.pause()
}

function dismissQuestion() {
    activeQuestion.value = null
    nextTick(() => {
        // 关闭后再次检查：若拖动跳过了多个题目时间点，依次弹出下一个
        checkAndTrigger()
        // 没有新的题目需要弹出时，恢复播放
        if (!activeQuestion.value && videoEl.value) {
            videoEl.value.play().catch(() => { /* 用户未交互时 play 可能被拒绝，忽略 */ })
        }
    })
}

// 时间戳百分比（用于时间轴标记定位）
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
.ivideo-render {
    width: 100%;
}

.ivideo-fade-enter-active,
.ivideo-fade-leave-active {
    transition: opacity 0.2s ease;
}

.ivideo-fade-enter-from,
.ivideo-fade-leave-to {
    opacity: 0;
}
</style>
