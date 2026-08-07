<template>
  <ol
    :style="listType !== 'decimal' ? `list-style-type: ${listType}` : undefined"
    :data-type="listType"
    :data-start="startAttr"
  >
    <RenderNode
      v-for="(child, i) in content"
      :key="i"
      :node="child"
      :block-key="blockKeyPrefix ? `${blockKeyPrefix}.${i}` : undefined"
    />
  </ol>
</template>

<script setup>
import RenderNode from '../node.vue'

const props = defineProps({
  node: { type: Object, required: true },
  // 顶层块 index（字符串），由 node.vue 在 trackReading 开启时传入。
  // 存在时为每个 <li> 生成独立 blockKey，实现逐行 hover 标黄。
  blockKeyPrefix: { type: String, default: undefined },
})

const attrs = computed(() => props.node.attrs || {})
const content = computed(() => props.node.content || [])
const listType = computed(() => attrs.value.listType || 'decimal')
const startAttr = computed(() =>
  attrs.value.start && attrs.value.start !== 1 ? attrs.value.start : undefined,
)
</script>
