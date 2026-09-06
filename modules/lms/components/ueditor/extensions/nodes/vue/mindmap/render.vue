<template>
    <div ref="wrapEl" class="mindmap-render-wrapper" :class="{ 'is-fullscreen': isFullscreen }">
        <UButton
            icon="i-lucide-maximize-2"
            size="2xs"
            variant="ghost"
            color="neutral"
            class="mindmap-fullscreen-btn"
            :title="$t('ueditor.mindmapFullscreen')"
            @click="toggleFullscreen"
        />
        <div ref="mindmapRef" class="mindmap-render-preview" :style="{ height: dynamicHeight + 'px', width: dynamicWidth }" />
    </div>
</template>

<script setup>
import { useMindmapRender } from './useMindmapRender'

const props = defineProps({
    node: Object,
})

const { wrapEl, mindmapRef, dynamicHeight, dynamicWidth, isFullscreen, toggleFullscreen } = useMindmapRender(props)
</script>

<style scoped>
.mindmap-render-wrapper {
    position: relative;
    width: 100%;
    overflow: auto;
    margin: 12px 0;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #fff;
}

.mindmap-render-preview {
    min-height: 300px;
    background: #fff;
}

.mindmap-fullscreen-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 10;
    opacity: 0.6;
    transition: opacity 0.15s ease;
}
.mindmap-render-wrapper:hover .mindmap-fullscreen-btn {
    opacity: 1;
}

/* 全屏：撑满视口，SVG 100% 缩放，root 居中 */
.mindmap-render-wrapper.is-fullscreen {
    position: fixed;
    inset: 0;
    z-index: 9999;
    width: 100vw;
    height: 100vh;
    margin: 0;
    border: none;
    border-radius: 0;
    background: #fff;
    overflow: hidden;
}

.mindmap-render-wrapper.is-fullscreen .mindmap-render-preview {
    width: 100% !important;
    height: 100% !important;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

.mindmap-render-wrapper.is-fullscreen .mindmap-render-preview :deep(svg) {
    width: 100% !important;
    height: 100% !important;
    max-width: 100%;
    max-height: 100%;
}
</style>