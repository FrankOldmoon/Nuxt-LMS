<template>
    <div>
        <!-- HTML Preview iframe -->
        <div ref="containerRef" class="html-preview-container border border-gray-200 dark:border-gray-600 rounded overflow-hidden relative">
            <iframe ref="iframeRef" :srcdoc="htmlContent" sandbox="allow-scripts" class="w-full html-preview-iframe"
                style="min-height: 300px; border: 0;" />
            <!-- FullscreenButton -->
            <UButton
                :icon="isFullscreen ? 'i-lucide-minimize' : 'i-lucide-maximize'"
                variant="ghost" size="2xs"
                class="absolute top-2 right-2 z-10 opacity-50 hover:opacity-100 transition-opacity bg-white/80 dark:bg-gray-800/80"
                @click="toggleFullscreen" />
        </div>

        <!-- Accuracy RateTip（SubmitBackShow） -->
        <div v-if="submitted && latestRate !== null" class="mt-2 text-xs text-gray-500">
            {{ $t('question.htmlCorrectRate') }}: {{ Math.round(latestRate * 100) }}%
        </div>
    </div>
</template>

<script setup>
import { useHtml } from './useHtml'

const props = defineProps({
    question: { type: Object, required: true },
    questionId: { type: Number, default: 0 },
})

const {
    iframeRef,
    containerRef,
    isFullscreen,
    htmlContent,
    submitted,
    latestRate,
    hasAnswer,
    toggleFullscreen,
    submit,
    reset,
    fillCorrectAnswer,
} = useHtml(props)

defineExpose({ submit, reset, hasAnswer, fillCorrectAnswer })
</script>

<style scoped>
/* Fullscreenwhen iframe supportFullscreen */
.html-preview-container:fullscreen {
    background: #fff;
}
.html-preview-container:fullscreen .html-preview-iframe {
    width: 100%;
    height: 100vh;
    min-height: 100vh;
}
</style>
