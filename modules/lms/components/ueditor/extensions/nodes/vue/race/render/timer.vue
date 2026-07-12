<template>
    <!-- ====== 倒计时 ====== -->
    <div class="mb-4 space-y-1">
        <div class="flex items-center justify-between text-xs">
            <span :class="timeRemaining <= 5 ? 'text-red-500 font-bold' : 'text-gray-500'">
                <UIcon name="i-lucide-timer" class="size-3.5 inline mr-1" />
                {{ formatTime(timeRemaining) }}
            </span>
            <span class="text-gray-400">
                {{ t('race.questionIndex', { n: Math.max(currentIndex + 1, 0), total: raceQuestions.length }) }}
            </span>
        </div>
        <div class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all duration-1000 ease-linear"
                :class="timeRemaining <= 5 ? 'bg-red-500' : 'bg-primary'"
                :style="{ width: timeProgress + '%' }" />
        </div>
    </div>
</template>

<script setup>
import { useRaceRenderContext } from '../useRaceRender'
const {
    t, timeRemaining, formatTime, timeProgress,
    currentIndex, raceQuestions,
} = useRaceRenderContext()
</script>
