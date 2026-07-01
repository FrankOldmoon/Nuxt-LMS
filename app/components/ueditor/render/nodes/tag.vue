<template>
  <span class="umo-node-tag" data-node-view-wrapper="">
    <span
      class="umo-node-tag-text"
      :style="{ color: attrs.color, backgroundColor: attrs.backgroundColor }"
    >{{ attrs.text || '' }}</span>
  </span>
</template>

<script setup>
const props = defineProps({
  node: { type: Object, required: true },
})

const attrs = computed(() => props.node.attrs || {})
</script>
