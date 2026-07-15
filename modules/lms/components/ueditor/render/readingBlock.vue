<template>
  <!-- Block content hover reading tracking wrapper -->
  <!-- Visual feedback: hover enter → yellow border; stay 3s mark as read → green border (persistent) -->
  <!-- Content under completed heading does not show highlight and does not start hover timer -->
  <div :class="wrapperClass" @mouseenter="onEnter" @mouseleave="onLeave">
    <slot />
  </div>
</template>

<script setup>
const props = defineProps({
  node: { type: Object, required: true },
  blockKey: { type: String, required: true },
})

const { shouldHighlight, headingDone, isHovering, onEnter, onLeave } = useReadingTracker(props.blockKey)

/**
 * Border highlight rules (all nodes use box-shadow border, no longer distinguish text/non-text):
 * - Read + heading not completed → green border (persistent "read" mark)
 * - Hovering + unread + heading not completed → yellow border (instant feedback)
 * - Other cases → no border
 */
const wrapperClass = computed(() => {
  if (shouldHighlight.value) return 'reading-visited-border'
  if (isHovering.value && !headingDone.value) return 'reading-hover-border'
  return undefined
})
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
