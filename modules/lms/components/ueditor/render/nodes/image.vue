<template>
  <div
    :class="['umo-node-view', { 'is-inline-image': attrs.inline, 'umo-floating-node': attrs.draggable }]"
    :style="wrapperStyle"
    data-node-view-wrapper=""
  >
    <div class="umo-node-container umo-node-image umo-select-outline">
      <img
        v-if="attrs.src"
        :src="attrs.src"
        :style="imgStyle"
        :data-id="attrs.id || undefined"
        :data-preview="attrs.previewType || undefined"
        loading="lazy"
      />
    </div>
  </div>
</template>

<script setup>
import { computeAtomNodeStyle } from '../helpers'

const props = defineProps({
  node: { type: Object, required: true },
})

const attrs = computed(() => props.node.attrs || {})

const wrapperStyle = computed(() => ({
  display: attrs.value.inline ? 'inline-block' : 'flex',
  ...computeAtomNodeStyle(attrs.value),
}))

const imgStyle = computed(() => {
  const style = {}
  if (attrs.value.flipX || attrs.value.flipY) {
    style.transform = `rotateX(${attrs.value.flipX ? '180' : '0'}deg) rotateY(${attrs.value.flipY ? '180' : '0'}deg)`
  }
  return style
})
</script>
