<template>
  <span class="umo-node-datetime" data-node-view-wrapper="">
    <span class="umo-node-datetime-text">{{ attrs.text || '' }}</span>
  </span>
</template>

<script setup>
const props = defineProps({
  node: { type: Object, required: true },
})

const attrs = computed(() => props.node.attrs || {})
</script>
