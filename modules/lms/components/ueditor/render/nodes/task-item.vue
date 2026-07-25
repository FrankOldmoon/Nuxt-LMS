<template>
  <!-- 顶层任务项：blockKey 存在时启用逐项 hover 追踪 -->
  <!-- hover → 黄边；停留 3s → 绿边（已读持久） -->
  <li
    :data-checked="checkedAttr"
    :class="liClass"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <label>
      <input type="checkbox" :checked="attrs.checked" disabled />
    </label>
    <div>
      <RenderNode v-for="(child, i) in content" :key="i" :node="child" />
    </div>
  </li>
</template>

<script setup>
import RenderNode from '../node.vue'

const props = defineProps({
  node: { type: Object, required: true },
  // 由列表组件传入，形如 "3.1"；不存在表示非追踪上下文
  blockKey: { type: String, default: undefined },
})

const attrs = computed(() => props.node.attrs || {})
const content = computed(() => props.node.content || [])
const checkedAttr = computed(() => (attrs.value.checked ? 'true' : 'false'))

// 仅在有 blockKey 时启用 hover 追踪
const tracking = props.blockKey ? useReadingTracker(props.blockKey) : null

const liClass = computed(() => {
  if (!tracking) return undefined
  if (tracking.shouldHighlight.value) return 'reading-visited-border'
  if (tracking.isHovering.value && !tracking.headingDone.value) return 'reading-hover-border'
  return undefined
})

function onEnter() {
  tracking?.onEnter()
}
function onLeave() {
  tracking?.onLeave()
}
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
