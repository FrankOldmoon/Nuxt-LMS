<template>
  <div
    ref="contentBox"
    class="relative border border-gray-200 rounded-md bg-white overflow-hidden"
  >
    <!-- 右上角全屏按钮 -->
    <button
      @click="toggleFullscreen"
      class="absolute top-2 right-2 text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors cursor-pointer z-10"
    >
      {{ $t('fullscreen') }}
    </button>

    <!--
      iframe 完全隔离用户 HTML：外部 CSS 不影响内容，内容 CSS 也不泄露。
      sandbox="allow-scripts" 允许脚本运行和交互，但不允许访问父页面。
    -->
    <iframe
      :srcdoc="iframeContent"
      sandbox="allow-scripts"
      class="w-full"
      :style="{ height: isFullscreen ? '100vh' : iframeHeight + 'px', border: 0 }"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  node: Object,
})

const contentBox = ref(null)
const iframeHeight = ref(300)
const isFullscreen = ref(false)

const userHtml = computed(() => props.node?.attrs?.content || '')

/** 构造 iframe srcdoc：包裹为基础 HTML 文档 + 高度上报脚本 */
const iframeContent = computed(() => {
  const html = userHtml.value
  // 已是完整 HTML 文档则直接使用
  const isFullDoc = /<html[\s>]/i.test(html) || /<!DOCTYPE/i.test(html)
  if (isFullDoc) return html

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
* { box-sizing: border-box; }
img { max-width: 100%; height: auto; }
body { margin: 0; padding: 8px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
</style>
</head><body>${html}
<script>
(function () {
  function reportHeight() {
    var h = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    if (h > 0) parent.postMessage({ type: 'html-node-height', height: h }, '*');
  }
  if (document.readyState === 'complete') reportHeight();
  else window.addEventListener('load', reportHeight);
  new MutationObserver(reportHeight).observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
<\/script>
</body></html>`
})

function onMessage(e) {
  if (e.data?.type === 'html-node-height' && e.data.height > 0) {
    iframeHeight.value = e.data.height
  }
}

function onFullscreenChange() {
  isFullscreen.value = document.fullscreenElement === contentBox.value
}

const toggleFullscreen = () => {
  if (!import.meta.client) return
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    contentBox.value?.requestFullscreen().catch(() => {})
  }
}

onMounted(() => {
  window.addEventListener('message', onMessage)
  document.addEventListener('fullscreenchange', onFullscreenChange)
})

onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  if (import.meta.client && document.fullscreenElement === contentBox.value) {
    document.exitFullscreen().catch(() => {})
  }
})
</script>

<style scoped>
/* 全屏时容器撑满屏幕 */
div:fullscreen {
  background: #fff;
  width: 100vw;
  height: 100vh;
  overflow: auto;
}
</style>
