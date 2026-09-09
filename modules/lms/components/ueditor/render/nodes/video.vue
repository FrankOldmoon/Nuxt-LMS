<template>
  <div class="umo-node-view" :style="nodeStyle" data-node-view-wrapper="">
    <!-- PeerTube embed：以 iframe 方式播放 -->
    <div v-if="embedUrl" class="umo-node-container w-full umo-node-iframe" :style="{ width: attrs.width ? `${attrs.width}px` : '100%', minHeight: '400px', height: attrs.height ? `${attrs.height}px` : 'auto' }">
      <iframe
        :src="embedUrl"
        class="peertube-iframe"
        :style="{ border: 0, width: '100%', height: '100%', minHeight: '400px', display: 'block', borderRadius: 'var(--umo-radius)' }"
        loading="lazy"
        allowfullscreen
      ></iframe>
    </div>
    <!-- 普通视频（如其它 CDN 直链）走原生 <video> -->
    <div v-else class="umo-node-container w-full">
      <video
        :src="attrs.src"
        controls
        preload="metadata"
        :style="videoStyle"
      ></video>
    </div>
  </div>
</template>

<script setup>
import { computeAtomNodeStyle } from '../helpers'

const props = defineProps({
  node: { type: Object, required: true },
})

const attrs = computed(() => props.node.attrs || {})

const nodeStyle = computed(() => computeAtomNodeStyle(attrs.value))

// 判断是否为 PeerTube embed 地址（…/videos/embed/{uuid}）
const embedUrl = computed(() => {
  const src = String(attrs.value.src || '')
  const m = src.match(/\/videos\/embed\/[A-Za-z0-9-]+/)
  return m ? src : null
})

const videoStyle = computed(() => ({
  display: 'block',
  maxWidth: '100%',
  width: attrs.value.width ? `${attrs.value.width}px` : '100%',
  minHeight: '400px',
  height: attrs.value.height ? `${attrs.value.height}px` : 'auto',
  borderRadius: 'var(--umo-radius)',
}))
</script>

<style scoped>
.umo-node-iframe iframe {
  border: 0;
}
</style>
