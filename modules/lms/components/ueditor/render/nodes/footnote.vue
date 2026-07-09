<template>
  <li :data-fn-id="attrs['data-fn-id']" :id="attrs.id">
    <RenderNode v-for="(child, i) in content" :key="i" :node="child" />
  </li>
</template>

<script setup>
import RenderNode from '../node.vue'

const props = defineProps({
  node: { type: Object, required: true },
})

const attrs = computed(() => props.node.attrs || {})
const content = computed(() => props.node.content || [])
</script>
