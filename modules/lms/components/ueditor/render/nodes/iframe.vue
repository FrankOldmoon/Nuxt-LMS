<template>
  <div class="umo-node-view" :style="nodeStyle" data-node-view-wrapper="">
    <div class="umo-node-container umo-select-outline umo-node-iframe" style="width: 100%">
      <iframe
        :src="attrs.src"
        :style="iframeStyle"
      ></iframe>
    </div>
  </div>
</template>

<script setup>
import { computeAtomNodeStyle } from '../helpers'

const props = defineProps({
  node: { type: Object, required: true },
})

const attrs = computed(() => props.node.attrs || {})

const nodeStyle = computed(() => ({
  display: 'flex',
  ...computeAtomNodeStyle(attrs.value),
}))

const iframeStyle = computed(() => ({
  display: 'block',
  width: '100%',
  height: `${attrs.value.height || 200}px`,
  border: 'none',
  background color: '#fff',
  pointerEvents: 'auto',
}))
</script>
