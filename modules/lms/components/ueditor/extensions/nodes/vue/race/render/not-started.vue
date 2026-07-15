<template>
    <!-- Not Started -->
    <div class="flex flex-col items-center gap-3 py-6">
        <template v-if="isTeacher">
            <UButton v-if="raceQuestions.length > 0" color="primary" size="lg" icon="i-lucide-play"
                :label="t('race.start')" @click="startRace" />
            <p v-else class="text-sm text-gray-400">{{ t('race.no questions') }}</p>
        </template>
        <template v-else>
            <UIcon name="i-lucide-hourglass" class="size-8 text-gray-300 animate-pulse" />
            <p class="text-sm text-gray-400">{{ t('race.waiting') }}</p>
        </template>
    </div>
</template>

<script setup>
import { useRaceRenderContext } from '../useRaceRender'
const { t, isTeacher, raceQuestions, startRace } = useRaceRenderContext()
</script>
