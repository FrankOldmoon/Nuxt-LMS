<template>
    <div class="flex items-center justify-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 select-none">
        <!-- mincolumns -->
        <div class="flex flex-col items-center gap-1">
            <UButton icon="i-lucide-chevron-up" size="xs" variant="ghost" :disabled="timerState !== 'idle'"
                @click="adjustMinutes(1)" />
            <div class="text-4xl font-mono font-bold tabular-nums w-14 text-center transition-colors"
                :class="timerTextClass">
                {{ displayMinutes }}
            </div>
            <UButton icon="i-lucide-chevron-down" size="xs" variant="ghost" :disabled="timerState !== 'idle'"
                @click="adjustMinutes(-1)" />
            <span class="text-xs text-muted">{{ $t('chapter.minutes') }}</span>
        </div>

        <div class="text-4xl font-bold text-muted pb-6">:</div>

        <!-- scolumns -->
        <div class="flex flex-col items-center gap-1">
            <UButton icon="i-lucide-chevron-up" size="xs" variant="ghost" :disabled="timerState !== 'idle'"
                @click="adjustSeconds(1)" />
            <div class="text-4xl font-mono font-bold tabular-nums w-14 text-center transition-colors"
                :class="timerTextClass">
                {{ displaySeconds }}
            </div>
            <UButton icon="i-lucide-chevron-down" size="xs" variant="ghost" :disabled="timerState !== 'idle'"
                @click="adjustSeconds(-1)" />
            <span class="text-xs text-muted">{{ $t('chapter.seconds') }}</span>
        </div>

        <!-- controlButton -->
        <div class="flex flex-col gap-1 ml-2">
            <UButton v-if="timerState !== 'running'" icon="i-lucide-play" color="primary" variant="soft" size="xs"
                :disabled="totalSeconds <= 0 && timerState === 'idle'"
                @click="timerState === 'idle' ? start() : resume()" />
            <UButton v-else icon="i-lucide-pause" color="warning" variant="soft" size="xs" @click="pause" />
            <UButton icon="i-lucide-rotate-ccw" color="neutral" variant="ghost" size="xs" @click="reset" />
        </div>
    </div>
</template>

<script setup>
import { useTimerRender } from './useTimerRender'

const props = defineProps({
    node: Object,
})
const emit = defineEmits(['update'])

const {
    timerState, displayMinutes, displaySeconds, timerTextClass,
    totalSeconds, adjustMinutes, adjustSeconds, start, pause, resume, reset,
} = useTimerRender(props, emit)
</script>
