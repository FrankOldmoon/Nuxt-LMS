<template>
  <div class="tableWrapper">
    <table class="umo-node-table">
      <tbody>
        <RenderNode v-for="(child, i) in content" :key="i" :node="child" />
      </tbody>
    </table>
  </div>
</template>

<script setup>
import RenderNode from '../node.vue'

const props = defineProps({
  node: { type: Object, required: true },
})

const content = computed(() => props.node.content || [])
</script>
