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
  // Top-level block index (string), passed in by node.vue when trackReading is enabled.
  // When present, generates independent blockKey for each <li> to enable per-line hover highlight.
  blockKeyPrefix: { type: String, default: undefined },
})

const content = computed(() => props.node.content || [])
</script>
