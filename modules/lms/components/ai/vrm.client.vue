<template>
  <div class="relative pointer-events-auto shrink-0">
    <div
      class="relative w-[300px] h-[400px] rounded-2xl overflow-hidden shadow-2xl border border-default bg-default/90 backdrop-blur-sm"
    >
      <!-- Close Button -->
      <button
        type="button"
        class="absolute top-2 right-2 z-10 size-7 rounded-full flex items-center justify-center bg-black/30 hover:bg-black/50 text-white/80 hover:text-white transition-colors"
        :title="t('common.close')"
        @click="close"
      >
        <UIcon name="i-lucide-x" class="size-4" />
      </button>

      <!-- Title -->
      <div class="absolute top-2 left-3 z-10 text-xs text-white/70 font-medium pointer-events-none">
        {{ t('ai.digitalHuman') }}
      </div>

      <!-- Loading -->
      <div
        v-if="loadState === 'loading'"
        class="absolute inset-0 flex flex-col items-center justify-center gap-3"
      >
        <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-primary" />
        <span class="text-xs text-muted">{{ loadingLabel }}</span>
      </div>

      <!-- Error -->
      <div
        v-else-if="loadState === 'error'"
        class="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6"
      >
        <UIcon name="i-lucide-alert-triangle" class="size-8 text-red-500" />
        <span class="text-xs text-red-500 text-center leading-relaxed">{{ errorMsg }}</span>
      </div>

      <!-- Canvas（3D Render） -->
      <canvas v-show="loadState === 'ready'" ref="canvasRef" class="w-full h-full block" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { VrmProps } from '../../composables/useVrm'

const props = withDefaults(defineProps<VrmProps>(), {
  modelUrl: 'https://cdn.jsdelivr.net/gh/pixiv/three-vrm@master/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm',
})

const emit = defineEmits<{
  close: []
  loaded: []
  error: [msg: string]
}>()

const { canvasRef, loadState, loadingLabel, errorMsg, t, close } = useVrm(props, emit)
</script>
