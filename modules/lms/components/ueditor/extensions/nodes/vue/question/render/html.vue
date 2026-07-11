<template>
    <div>
        <!-- HTML 预览 iframe -->
        <div ref="containerRef" class="html-preview-container border border-gray-200 dark:border-gray-600 rounded overflow-hidden relative">
            <iframe ref="iframeRef" :srcdoc="htmlContent" sandbox="allow-scripts" class="w-full html-preview-iframe"
                style="min-height: 300px; border: 0;" />
            <!-- 全屏按钮 -->
            <UButton
                :icon="isFullscreen ? 'i-lucide-minimize' : 'i-lucide-maximize'"
                variant="ghost" size="2xs"
                class="absolute top-2 right-2 z-10 opacity-50 hover:opacity-100 transition-opacity bg-white/80 dark:bg-gray-800/80"
                @click="toggleFullscreen" />
        </div>

        <!-- 正确率提示（提交后显示） -->
        <div v-if="submitted && latestRate !== null" class="mt-2 text-xs text-gray-500">
            {{ $t('question.htmlCorrectRate') }}: {{ Math.round(latestRate * 100) }}%
        </div>
    </div>
</template>

<script setup>
import { ref, computed, inject, watch, onMounted, onBeforeUnmount } from 'vue'
import { submitQuestion, recordAnswer, computeCorrectRate } from './shared.ts'

const props = defineProps({
    question: { type: Object, required: true },
    questionId: { type: Number, default: 0 },
})

const submitted = inject('questionSubmitted')
const isCorrect = inject('questionIsCorrect')
const fromRecord = inject('questionFromRecord')
const { courseId, chapterId } = useLmsContext()

const iframeRef = ref(null)
const containerRef = ref(null)
const isFullscreen = ref(false)

// 全屏切换
function toggleFullscreen() {
    if (!import.meta.client) return
    const el = containerRef.value
    if (!el) return
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
    } else {
        el.requestFullscreen().catch(() => {})
    }
}

function onFullscreenChange() {
    isFullscreen.value = document.fullscreenElement === containerRef.value
}

// HTML 内容
const htmlContent = computed(() => {
    const c = props.question.content
    if (typeof c === 'string') return c
    return ''
})

// iframe 传来的正确率
const latestRate = ref(null)

const hasAnswer = computed(() => latestRate.value !== null)

// 监听 iframe message（通过 event.source 区分不同 iframe）
function onMessage(event) {
    // 只处理来自当前 iframe 的消息
    if (event.source !== iframeRef.value?.contentWindow) return
    if (event.data && typeof event.data === 'object' && event.data.type === 'correct_rate') {
        const rate = Number(event.data.rate)
        if (!isNaN(rate) && rate >= 0 && rate <= 1) {
            latestRate.value = rate
            if (submitted.value) {
                submitted.value = false
            }
            if (fromRecord.value) {
                fromRecord.value = false
            }
            // 实时记录到 record
            recordAnswer(props.question, [rate])
        }
    }
}

onMounted(() => {
    window.addEventListener('message', onMessage)
    document.addEventListener('fullscreenchange', onFullscreenChange)
})

onBeforeUnmount(() => {
    window.removeEventListener('message', onMessage)
    document.removeEventListener('fullscreenchange', onFullscreenChange)
    // 组件卸载时若仍在全屏，退出全屏
    if (import.meta.client && document.fullscreenElement === containerRef.value) {
        document.exitFullscreen().catch(() => {})
    }
})

// 监听 record 变化（fetchRecord 回填场景）
watch(() => props.question?.record, (record) => {
    if (!Array.isArray(record) || record.length === 0) return
    const rate = Number(record[0])
    if (!isNaN(rate)) {
        latestRate.value = rate
    }
}, { immediate: true })

function submit() {
    if (!props.question) return
    const rate = latestRate.value ?? 0
    const correct = rate >= 1
    isCorrect.value = correct
    submitQuestion({
        questionId: props.questionId,
        userAnswer: [rate],
        isCorrect: correct,
        correctRate: rate,
        courseId: courseId.value,
        chapterId: chapterId.value,
        point: props.question.point,
    })
    return { isCorrect: correct }
}

function reset() {
    latestRate.value = null
    props.question.record = []
}

function fillCorrectAnswer() {
    // HTML 题无法自动填充正确答案
    latestRate.value = 1
    recordAnswer(props.question, [1])
}

defineExpose({ submit, reset, hasAnswer, fillCorrectAnswer })
</script>

<style scoped>
/* 全屏时 iframe 撑满屏幕 */
.html-preview-container:fullscreen {
    background: #fff;
}
.html-preview-container:fullscreen .html-preview-iframe {
    width: 100%;
    height: 100vh;
    min-height: 100vh;
}
</style>