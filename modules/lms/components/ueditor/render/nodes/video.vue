<template>
  <div class="umo-node-view" :style="nodeStyle" data-node-view-wrapper="">
    <div class="umo-node-container">
      <video
        :src="attrs.src"
        controls
        preload="metadata"
        crossorigin="anonymous"
        :style="videoStyle"
      ></video>
    </div>
  </div>
</template>

<script setup>
import { computeAtomNodeStyle } from '../helpers'

const props = defineProps({
  node: { type: Object, required: true },
})

const attrs = computed(() => props.node.attrs || {})

const nodeStyle = computed(() => computeAtomNodeStyle(attrs.value))

const videoStyle = computed(() => ({
  display: 'block',
  maxWidth: '100%',
  width: '100%',
  height: attrs.value.height ? `${attrs.value.height}px` : 'auto',
  borderRadius: 'var(--umo-radius)',
}))
</script>
