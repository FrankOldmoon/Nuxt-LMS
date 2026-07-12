<template>
    <div class="mt-4">
        <div class="p-4 rounded-lg"
            :class="resultPassed ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'">
            <div class="text-lg font-semibold"
                :class="resultPassed ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'">
                {{ resultScore }} / {{ quiz.point }}{{ t('question.points') }}
            </div>
            <div class="text-sm text-gray-500 mt-1">
                {{ resultPassed ? t('quiz.passed') : t('quiz.notPassed') }}
            </div>
        </div>
    </div>
</template>

<script setup>
import { useQuizRenderContext } from '../useQuizRender'

const { t, quiz, resultScore, resultPassed } = useQuizRenderContext()
</script>
