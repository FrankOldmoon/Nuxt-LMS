<template>
  <canvas ref="canvasRef" class="fireworks-canvas"></canvas>
</template>

<script setup>
import { useFireworks } from './useFireworks'

const emit = defineEmits(['done'])
const { canvasRef } = useFireworks(emit)
</script>

<style scoped>
.fireworks-canvas {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 15;
}
</style>
