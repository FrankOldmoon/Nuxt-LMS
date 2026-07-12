<template>
  <!-- 顶层列表项：blockKey 存在时启用逐项 hover 追踪（停留 3s 标黄） -->
  <!-- 嵌套列表项（blockKey 为空）不追踪，由外层 <li> 统一覆盖 -->
  <li :class="liClass" @mouseenter="onEnter" @mouseleave="onLeave">
    <RenderNode v-for="(child, i) in content" :key="i" :node="child" />
  </li>
</template>

<script setup>
import RenderNode from '../node.vue'

const props = defineProps({
  node: { type: Object, required: true },
  // 由列表组件传入，形如 "3.1"；不存在表示非追踪上下文（嵌套列表或未开启 trackReading）
  blockKey: { type: String, default: undefined },
})

const content = computed(() => props.node.content || [])

// 仅在有 blockKey 时启用 hover 追踪（setup 阶段一次性求值，blockKey 不会变化）
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
