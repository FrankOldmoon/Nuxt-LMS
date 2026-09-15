<template>
  <div class="umo-node-view" :style="nodeStyle" data-node-view-wrapper="">
    <div ref="containerRef" class="umo-node-container umo-select-outline umo-node-iframe" style="width: 100%">
      <iframe
        ref="iframeRef"
        :src="attrs.src"
        :style="iframeStyle"
      ></iframe>
      <button
        class="iframe-btn iframe-open-btn"
        :title="$t('ueditor.iframe.openInNewTab')"
        @click.stop="openInNewTab"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
          <path d="M10 1.5h4.5V6H13V3.6L7.3 9.3 6.4 8.4L12 2.8H10V1.5zM2 2.5h4.5V4H3.5v9.5H13V10h1.5v4.5H2V2.5z" />
        </svg>
      </button>
      <button
        class="iframe-btn iframe-fullscreen-btn"
        :title="isFullscreen ? $t('ueditor.iframe.exitFullscreen') : $t('ueditor.iframe.fullscreen')"
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
const iframeRef = ref(null)
const isFullscreen = ref(false)
// 内容自适应高度（0 表示未获取到，使用默认/手动高度）
const autoHeight = ref(0)

const nodeStyle = computed(() => ({
  display: 'flex',
  ...computeAtomNodeStyle(attrs.value),
}))

const iframeStyle = computed(() => ({
  display: 'block',
  width: '100%',
  // 全屏时撑满容器，避免下方留白；否则优先内容自适应高度
  height: isFullscreen.value ? '100%' : `${autoHeight.value > 0 ? autoHeight.value : (attrs.value.height || 200)}px`,
  border: isFullscreen.value ? 'none' : '1px solid #1f2937',
  borderRadius: isFullscreen.value ? '0' : '4px',
  backgroundColor: '#fff',
  pointerEvents: 'auto',
}))

// 同步 iframe 内容实际高度（同源可读取；跨域抛 SecurityError，保持默认高度）
function syncHeight() {
  const iframe = iframeRef.value
  if (!iframe) return
  try {
    const doc = iframe.contentDocument
    if (!doc?.body) return
    const viewH = iframe.contentWindow?.innerHeight || 0
    // 视口自适应内容（html/body height:100% 全屏布局）无法测量自然高度，当前视口过小时给默认高度
    const DEFAULT_HEIGHT = 600
    // body 内容实际高度（不受 iframe 视口高度影响）
    const bodyH = doc.body.getBoundingClientRect().height
    const scrollH = Math.max(
      doc.body.scrollHeight,
      doc.documentElement?.scrollHeight || 0,
    )
    let h = bodyH
    if (scrollH > viewH) {
      // 内容溢出视口时 scrollHeight 才是真实所需高度
      h = Math.max(h, scrollH)
    } else if (bodyH >= viewH && viewH < DEFAULT_HEIGHT) {
      // 内容被拉伸填满视口且未溢出 → 视口自适应布局，使用默认高度
      h = DEFAULT_HEIGHT
    }
    if (h > 0) autoHeight.value = h
  } catch {
    // 跨域 iframe 无法读取，忽略
  }
}

// 同源时监听内容动态变化（子元素增删/尺寸变化）
let contentObserver = null
function watchContentHeight() {
  try {
    const doc = iframeRef.value?.contentDocument
    if (!doc?.body) return
    contentObserver?.disconnect()
    contentObserver = new MutationObserver(syncHeight)
    contentObserver.observe(doc.body, { childList: true, subtree: true })
  } catch {
    // 跨域无法观察，忽略
  }
}

function toggleFullscreen() {
  const el = containerRef.value
  if (!el) return
  // 已是本 iframe 的全屏 → 退出
  if (document.fullscreenElement === el) {
    document.exitFullscreen()
    return
  }
  // 已处于其它元素的全屏 → 先退出该全屏，退出完成后自动进入本 iframe 全屏（切换全屏目标）
  if (document.fullscreenElement) {
    const onExit = () => {
      document.removeEventListener('fullscreenchange', onExit)
      containerRef.value?.requestFullscreen().catch(() => {})
    }
    document.addEventListener('fullscreenchange', onExit)
    document.exitFullscreen()
    return
  }
  el.requestFullscreen().catch(() => {})
}

function openInNewTab() {
  const src = attrs.value.src
  if (!src) return
  // 相对地址补全为完整 URL，再在新标签页打开
  window.open(new URL(src, window.location.origin).href, '_blank', 'noopener,noreferrer')
}

function onFullscreenChange() {
  // 仅当本 iframe 容器处于全屏时才判定为全屏；否则（其它元素全屏时）保持普通高度，避免 iframe 缩到很小
  isFullscreen.value = containerRef.value === document.fullscreenElement
}

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
  const iframe = iframeRef.value
  if (!iframe) return
  // SSR/hydration：iframe 可能已在挂载前加载完成（load 不再触发），先主动同步一次
  syncHeight()
  watchContentHeight()
  iframe.addEventListener('load', () => {
    syncHeight()
    watchContentHeight()
  })
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  contentObserver?.disconnect()
  contentObserver = null
})
</script>

<style scoped>
.umo-node-iframe {
  position: relative;
}

.iframe-btn {
  position: absolute;
  top: 6px;
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

.iframe-open-btn {
  right: 38px;
  /* 打开新标签页按钮始终显示(不依赖悬停), 便于发现与点击 */
  opacity: 1;
}

.iframe-fullscreen-btn {
  right: 6px;
  /* 全屏按钮始终显示，不依赖悬停 */
  opacity: 1;
}

.umo-node-iframe:hover .iframe-btn {
  opacity: 1;
}

.iframe-btn:hover {
  background: rgba(0, 0, 0, 0.65);
}

.umo-node-iframe:fullscreen {
  background: #fff;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: stretch;
}

.umo-node-iframe:fullscreen iframe {
  width: 100% !important;
  height: 100% !important;
}
</style>
