<template>
  <!-- 块级内容 hover 阅读追踪包装：停留 3s 标记已读，已读后高亮 -->
  <!-- 已完成 heading 下的内容不再高亮，也不启动 hover 计时 -->
  <!-- 纯文本块（段落/引用）用黄色背景；非文本组件（图片/echarts/codeBlock/表格等）用黄色边框 -->
  <div :class="wrapperClass" @mouseenter="onEnter" @mouseleave="onLeave">
    <slot />
  </div>
</template>

<script setup>
const props = defineProps({
  node: { type: Object, required: true },
  blockKey: { type: String, required: true },
})

// 纯文本块用背景高亮；有自身背景/可视元素的组件用边框高亮（背景会被遮挡）
const TEXT_TYPES = new Set(['paragraph', 'blockquote'])
const isTextOnly = computed(() => TEXT_TYPES.has(props.node?.type))

const { shouldHighlight, onEnter, onLeave } = useReadingTracker(props.blockKey)

const wrapperClass = computed(() => ({
  'reading-visited-bg': shouldHighlight.value && isTextOnly.value,
  'reading-visited-border': shouldHighlight.value && !isTextOnly.value,
}))
</script>

<style scoped>
.reading-visited-bg {
  background-color: rgba(250, 204, 21, 0.35);
  border-radius: 4px;
}

/* 用 box-shadow 替代 border，避免高亮出现/消失时 2px 布局抖动 */
.reading-visited-border {
  box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.9);
  border-radius: 4px;
}
</style>
