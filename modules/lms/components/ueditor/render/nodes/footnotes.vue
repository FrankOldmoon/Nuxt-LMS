<template>
  <ol class="umo-node-footnotes">
    <RenderNode v-for="(child, i) in content" :key="i" :node="child" />
  </ol>
</template>

<script setup>
import RenderNode from '../node.vue'

const props = defineProps({
  node: { type: Object, required: true },
})

const content = computed(() => props.node.content || [])
</script>
