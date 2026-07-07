<template>
  <th v-bind="cellAttrs">
    <RenderNode v-for="(child, i) in content" :key="i" :node="child" />
  </th>
</template>

<script setup>
import RenderNode from '../../../render/node.vue'
import { computeTableCellAttrs } from '../../../render/helpers.js'

const props = defineProps({
  node: { type: Object, required: true },
})

const attrs = computed(() => props.node.attrs || {})
const content = computed(() => props.node.content || [])
const cellAttrs = computed(() => computeTableCellAttrs(attrs.value))
</script>
