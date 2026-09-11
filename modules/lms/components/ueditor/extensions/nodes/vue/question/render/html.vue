<template>
    <div>
        <!-- HTML 预览 iframe -->
        <div ref="containerRef" class="html-preview-container border border-gray-200 dark:border-gray-600 rounded overflow-hidden relative">
            <iframe ref="iframeRef" :srcdoc="htmlContent" sandbox="allow-scripts" class="w-full html-preview-iframe"
                :style="{ height: isFullscreen ? '100vh' : iframeHeight + 'px', minHeight: isFullscreen ? '100vh' : '300px', border: 0 }" />
            <!-- 全屏按钮 -->
            <button
                @click="toggleFullscreen"
                :class="isFullscreen ? 'opacity-10 hover:opacity-100' : ''"
                class="absolute top-2 right-2 text-xs px-2.5 py-1 bg-gray-100 text-green-600 rounded hover:bg-green-200 transition-colors cursor-pointer z-10"
            >
                {{ $t('common.fullscreen') }}
            </button>
        </div>

        <!-- 正确率实时显示（iframe 通报的最新正确率） -->
        <div v-if="latestRate !== null" class="mt-2 text-xs" :class="latestRate > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500'">
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
    iframeHeight,
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
