<template>
    <!-- ====== 教师控制按钮（仅教师，题目上方） ====== -->
    <div class="flex items-center justify-between mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
        <UButton color="error" variant="outline" size="sm" icon="i-lucide-flag"
            :label="t('race.end')" @click="endRace" />
        <div class="flex items-center gap-3">
            <span class="text-xs text-gray-400">{{ Math.max(currentIndex + 1, 0) }} / {{ raceQuestions.length }}</span>
        </div>
        <UButton v-if="currentQuestionCid" color="error" variant="solid" size="lg" icon="i-lucide-stop-circle"
            :label="t('race.showResult')" @click="endQuestion" />
        <UButton v-else color="success" variant="solid" size="lg" icon="i-lucide-arrow-right"
            :label="t('race.next')" :disabled="currentIndex >= raceQuestions.length - 1" @click="nextQuestion" />
    </div>
</template>

<script setup>
const {
    t, raceQuestions, currentIndex, currentQuestionCid,
    endRace, endQuestion, nextQuestion,
} = useRaceRenderContext()
</script>
