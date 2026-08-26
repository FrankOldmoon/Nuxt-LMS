<template>
  <!-- 块级内容 hover 阅读追踪包装 -->
  <!-- 视觉反馈：hover 进入 → 黄色边框；停留 3s 标记已读 → 绿色边框（持久） -->
  <!-- 已完成 heading 下的内容不显示高亮，也不启动 hover 计时 -->
  <div :class="wrapperClass" @mouseenter="onEnter" @mouseleave="onLeave">
    <slot />
  </div>
</template>

<script setup>
const props = defineProps({
  node: { type: Object, required: true },
  blockKey: { type: String, required: true },
  // instant=true 时 hover 进入即标记已读（无可监控块的标题）
  instant: { type: Boolean, default: false },
})

const { shouldHighlight, headingDone, isHovering, onEnter, onLeave } = useReadingTracker(props.blockKey, props.instant)

/**
 * 边框高亮规则（所有 node 一律用 box-shadow 边框，不再区分文字/非文字）：
 * - 已读 + heading 未完成 → 绿色边框（持久"已读"标记）
 * - 正在 hover + 未读 + heading 未完成 → 黄色边框（瞬时反馈）
 * - 其余情况 → 无边框
 */
const wrapperClass = computed(() => {
  if (shouldHighlight.value) return 'reading-visited-border'
  if (isHovering.value && !headingDone.value) return 'reading-hover-border'
  return undefined
})
</script>

<style scoped>
/* 用 box-shadow 替代 border，避免高亮出现/消失时 2px 布局抖动 */
.reading-hover-border {
  box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.9);
  border-radius: 4px;
  transition: box-shadow 0.2s ease;
}

.reading-visited-border {
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.9);
  border-radius: 4px;
  transition: box-shadow 0.2s ease;
}
</style>
