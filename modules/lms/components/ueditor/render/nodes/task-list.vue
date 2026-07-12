<template>
  <ul class="umo-task-list" data-type="taskList">
    <RenderNode
      v-for="(child, i) in content"
      :key="i"
      :node="child"
      :block-key="blockKeyPrefix ? `${blockKeyPrefix}.${i}` : undefined"
    />
  </ul>
</template>

<script setup>
import RenderNode from '../node.vue'

const props = defineProps({
  node: { type: Object, required: true },
  // 顶层块 index（字符串），由 node.vue 在 trackReading 开启时传入。
  // 存在时为每个 <li> 生成独立 blockKey，实现逐行 hover 标黄。
  blockKeyPrefix: { type: String, default: undefined },
})

const content = computed(() => props.node.content || [])
</script>
