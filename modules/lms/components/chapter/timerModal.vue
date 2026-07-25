<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'max-w-md' }">
    <template #content>
      <div class="p-6 space-y-8">
        <h3 class="text-lg font-semibold text-center">{{ $t('chapter.timer') }}</h3>

        <!-- 时间调节与显示区 -->
        <div class="flex items-center justify-center gap-4">
          <template v-for="(col, i) in timeColumns" :key="col.label">
            <div v-if="i > 0" class="text-6xl font-bold text-muted pb-10">:</div>
            <div class="flex flex-col items-center gap-2">
              <UButton icon="i-lucide-chevron-up" size="sm" variant="ghost"
                :disabled="timerState !== 'idle'" @click="col.adjust(1)" />
              <div class="text-6xl font-mono font-bold tabular-nums w-20 text-center transition-colors"
                :class="timerTextClass">
                {{ col.display }}
              </div>
              <UButton icon="i-lucide-chevron-down" size="sm" variant="ghost"
                :disabled="timerState !== 'idle'" @click="col.adjust(-1)" />
              <span class="text-sm text-muted">{{ $t(col.label) }}</span>
            </div>
          </template>
        </div>

        <!-- 控制按钮区 -->
        <div class="flex items-center justify-center gap-3">
          <UButton icon="i-lucide-rotate-ccw" color="neutral" variant="outline"
            :label="$t('chapter.reset')" @click="reset" />
          <UButton v-if="timerState !== 'running'" icon="i-lucide-play" color="primary"
            :label="timerState === 'paused' ? $t('chapter.resume') : $t('chapter.start')"
            :disabled="totalSeconds <= 0 && timerState === 'idle'"
            @click="timerState === 'idle' ? start() : resume()" />
          <UButton v-else icon="i-lucide-pause" color="warning"
            :label="$t('chapter.pause')" @click="pause" />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const isOpen = defineModel('open', { default: false })

const {
  timerState, totalSeconds, displayMinutes, displaySeconds, timerTextClass,
  adjustMinutes, adjustSeconds, start, pause, resume, reset,
} = useChapterTimer(isOpen)

const timeColumns = computed(() => [
  { label: 'chapter.minutes', display: displayMinutes.value, adjust: adjustMinutes },
  { label: 'chapter.seconds', display: displaySeconds.value, adjust: adjustSeconds },
])
</script>
