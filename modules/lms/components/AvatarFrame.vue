<template>
  <!-- 头像框 SVG：三种款式（bronze / silver / gold），铺满父容器 -->
  <svg
    v-if="frame"
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    class="pointer-events-none select-none"
    :class="className"
  >
    <!-- 外圈渐变环 -->
    <defs>
      <linearGradient :id="`avatar-frame-${frame}`" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" :stop-color="cfg.from" />
        <stop offset="100%" :stop-color="cfg.to" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="none" :stroke="`url(#avatar-frame-${frame})`" stroke-width="7" />
    <!-- 内圈细线 -->
    <circle cx="50" cy="50" r="41" fill="none" :stroke="cfg.inner" stroke-width="2" opacity="0.7" />
    <!-- 底部菱形宝石 -->
    <path :d="gemPath" :fill="cfg.gem" />
    <!-- 两侧小光点 -->
    <circle cx="22" cy="50" r="2.5" :fill="cfg.spark" />
    <circle cx="78" cy="50" r="2.5" :fill="cfg.spark" />
  </svg>
</template>

<script setup lang="ts">
const props = defineProps<{
  frame?: string | null
  className?: string
}>()

const VALID = ['bronze', 'silver', 'gold']

const CONFIG: Record<string, { from: string; to: string; inner: string; gem: string; spark: string }> = {
  bronze: { from: '#cd7f32', to: '#8c5a2b', inner: '#b87333', gem: '#a0522d', spark: '#e8c39e' },
  silver: { from: '#e8e8e8', to: '#9aa0a6', inner: '#cfd4d9', gem: '#9aa0a6', spark: '#ffffff' },
  gold: { from: '#ffe27a', to: '#d4a017', inner: '#f6c344', gem: '#e6b800', spark: '#fff7d6' },
}

const frame = computed(() => (VALID.includes(props.frame || '') ? props.frame : null))
const cfg = computed(() => CONFIG[frame.value || 'bronze'])

// 底部菱形宝石（贴框内下沿）
const gemPath = 'M50 78 L58 86 L50 94 L42 86 Z'
</script>
