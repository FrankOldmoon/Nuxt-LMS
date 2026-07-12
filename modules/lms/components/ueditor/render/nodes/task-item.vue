<template>
  <!-- 顶层任务项：blockKey 存在时启用逐项 hover 追踪（停留 3s 标黄） -->
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
  if (!tracking?.shouldHighlight.value) return undefined
  return 'reading-visited-bg'
})

function onEnter() {
  tracking?.onEnter()
}
function onLeave() {
  tracking?.onLeave()
}
</script>

<style scoped>
.reading-visited-bg {
  background-color: rgba(250, 204, 21, 0.35);
  border-radius: 4px;
}
</style>
