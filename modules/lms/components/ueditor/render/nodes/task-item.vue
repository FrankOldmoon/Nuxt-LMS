<template>
  <!-- Top-level task item: enable per-item hover tracking when blockKey exists -->
  <!-- hover → yellow border; stay 3s → green border (read, persistent) -->
  <li
    :data-checked="checkedAttr"
    :class="liClass"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <label>
      <input type="checkbox" :checked="attrs.checked" disabled />
    </label>
    <div>
      <RenderNode v-for="(child, i) in content" :key="i" :node="child" />
    </div>
  </li>
</template>

<script setup>
import RenderNode from '../node.vue'

const props = defineProps({
  node: { type: Object, required: true },
  // Passed in by list component, e.g. "3.1"; absence means non-tracking context
  blockKey: { type: String, default: undefined },
})

const attrs = computed(() => props.node.attrs || {})
const content = computed(() => props.node.content || [])
const checkedAttr = computed(() => (attrs.value.checked ? 'true' : 'false'))

// Only enable hover tracking when blockKey exists
const tracking = props.blockKey ? useReadingTracker(props.blockKey) : null

const liClass = computed(() => {
  if (!tracking) return undefined
  if (tracking.shouldHighlight.value) return 'reading-visited-border'
  if (tracking.isHovering.value && !tracking.headingDone.value) return 'reading-hover-border'
  return undefined
})

function onEnter() {
  tracking?.onEnter()
}
function onLeave() {
  tracking?.onLeave()
}
</script>

<style scoped>
/* Use box-shadow instead of border to avoid 2px layout jitter when highlight appears/disappears */
.reading-hover-border {
  box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.9);
  border-radius: 4px;
  transition: box-shadow 0.2s ease;
}

.reading-visited-border {
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.9);
  border-radius: 4px;
  transition: box-shadow 0.2s ease;
}
</style>
