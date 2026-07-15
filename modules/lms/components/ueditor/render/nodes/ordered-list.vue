<template>
  <ol
    :style="`list-style-type: ${listType}`"
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
  // Top-level block index (string), passed in by node.vue when trackReading is enabled.
  // When present, generates independent blockKey for each <li> to enable per-line hover highlight.
  blockKeyPrefix: { type: String, default: undefined },
})

const attrs = computed(() => props.node.attrs || {})
const content = computed(() => props.node.content || [])
const listType = computed(() => attrs.value.listType || 'decimal')
const startAttr = computed(() =>
  attrs.value.start && attrs.value.start !== 1 ? attrs.value.start : undefined,
)
</script>
