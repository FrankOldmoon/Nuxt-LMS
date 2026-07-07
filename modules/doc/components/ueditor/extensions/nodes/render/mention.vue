<template>
  <span
    class="umo-node-mention"
    data-type="mention"
    :data-id="attrs.id"
    :data-label="attrs.label"
  >{{ attrs.label || '' }}</span>
</template>

<script setup>
const props = defineProps({
  node: { type: Object, required: true },
})

const attrs = computed(() => props.node.attrs || {})
</script>
