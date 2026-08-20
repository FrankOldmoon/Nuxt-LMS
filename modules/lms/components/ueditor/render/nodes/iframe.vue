<template>
  <div class="umo-node-view" :style="nodeStyle" data-node-view-wrapper="">
    <div ref="containerRef" class="umo-node-container umo-select-outline umo-node-iframe" style="width: 100%">
      <iframe
        :src="attrs.src"
        :style="iframeStyle"
      ></iframe>
      <button
        class="iframe-fullscreen-btn"
        :title="isFullscreen ? '退出全屏' : '全屏'"
        @click.stop="toggleFullscreen"
      >
        <svg v-if="!isFullscreen" viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
          <path d="M6.5 1.5H2v4.5h1.5V3h3V1.5zM13.5 1.5H9.5V3h3v3H14V1.5h-.5zM1.5 9.5V14H6v-1.5H3v-3H1.5zM14 9.5H12.5V13h-3v1.5H14V9.5z" />
        </svg>
        <svg v-else viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
          <path d="M6.5 1.5H2v4.5h1.5V3h3V1.5zM13.5 1.5H9.5V3h3v3H14V1.5h-.5zM1.5 9.5V14H6v-1.5H3v-3H1.5zM14 9.5H12.5V13h-3v1.5H14V9.5z" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computeAtomNodeStyle } from '../helpers'

const props = defineProps({
  node: { type: Object, required: true },
})

const attrs = computed(() => props.node.attrs || {})

const containerRef = ref(null)
const isFullscreen = ref(false)

const nodeStyle = computed(() => ({
  display: 'flex',
  ...computeAtomNodeStyle(attrs.value),
}))

const iframeStyle = computed(() => ({
  display: 'block',
  width: '100%',
  height: `${attrs.value.height || 200}px`,
  border: '1px solid #e5e7eb',
  borderRadius: '4px',
  backgroundColor: '#fff',
  pointerEvents: 'auto',
}))

function toggleFullscreen() {
  const el = containerRef.value
  if (!el) return
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    el.requestFullscreen()
  }
}

function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
}

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
})
</script>

<style scoped>
.umo-node-iframe {
  position: relative;
}

.iframe-fullscreen-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

.umo-node-iframe:hover .iframe-fullscreen-btn {
  opacity: 1;
}

.iframe-fullscreen-btn:hover {
  background: rgba(0, 0, 0, 0.65);
}

.umo-node-iframe:fullscreen {
  background: #fff;
}
</style>
