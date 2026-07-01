<template>
  <component
    v-if="comp"
    :is="comp"
    :node="node"
  />
</template>

<script setup>
import counter from './counter.vue'

const comps = { counter }
const props = defineProps({
  node: Object,
})
const comp = computed(() => comps[props.node?.attrs?.type] || null)
</script>
