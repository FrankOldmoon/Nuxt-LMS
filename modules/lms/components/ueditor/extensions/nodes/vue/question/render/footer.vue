<template>
    <!-- Submit/Reset（publicTotal，quiz mode downHide） -->
    <div v-if="question && !inQuiz" class="flex items-center gap-2 pt-3">
        <!-- Tag -->
        <div v-if="question.tags && question.tags.length" class="flex flex-wrap gap-1">
            <span v-for="(tag, idx) in question.tags" :key="idx"
                class="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded text-xs">
                {{ tag }}
            </span>
        </div>
        <div class="flex gap-2 ml-auto">
            <UButton variant="soft" size="sm" :disabled="!hasAnswer" @click="onReset">
                {{ t('common.reset') }}
            </UButton>
            <UButton color="primary" size="sm" :disabled="!hasAnswer" @click="onSubmit">
                {{ t('question.submit') }}
            </UButton>
        </div>
    </div>

    <!-- result（publicTotal） -->
    <div v-if="submitted" class="mt-4 space-y-3">
        <ResultBanner :correct="isCorrect" :point="question?.point" />
        <!-- AnswerCorrectonlyShowCorrectAnswerandAnalysis -->
        <template v-if="isCorrect">
            <div class="mb-2">
                <span class="text-sm text-gray-500">{{ t('question.correctAnswerLabel') }}</span>
                <div class="flex flex-wrap gap-2 mt-1">
                    <div v-for="(ans, idx) in formattedAnswers" :key="idx"
                        class="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded text-sm">
                        <span class="font-medium text-green-700 dark:text-green-300">{{ ans }}</span>
                    </div>
                </div>
            </div>
            <ExplanationBlock :explanation="question?.explanation" />
        </template>
    </div>

    <!-- ShowAnswer（onlyTeacherVisible，alwaysShow） -->
    <div v-if="question && isTeacher" class="mt-4 flex items-start gap-2">
        <UButton variant="soft" size="sm" @click="onShowAnswer">
            {{ showAnswer ? t('question.hideAnswer') : t('question.showAnswer') }}
        </UButton>
        <div v-if="showAnswer" class="flex-1">
            <!-- CorrectAnswer -->
            <div class="mb-2">
                <span class="text-sm text-gray-500">{{ t('question.correctAnswerLabel') }}</span>
                <div class="flex flex-wrap gap-2 mt-1">
                    <div v-for="(ans, idx) in formattedAnswers" :key="idx"
                        class="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded text-sm">
                        <span class="font-medium text-green-700 dark:text-green-300">{{ ans }}</span>
                    </div>
                </div>
            </div>
            <!-- AnswerAnalysis -->
            <ExplanationBlock v-if="question?.explanation" :explanation="question?.explanation" />
        </div>
    </div>
</template>

<script setup>
import ResultBanner from './result-banner.vue'
import ExplanationBlock from './explanation-block.vue'
import { useQuestionRenderContext } from '../useQuestionRender'
const {
    t, question, isTeacher, submitted, isCorrect, showAnswer,
    hasAnswer, formattedAnswers, onSubmit, onReset, onShowAnswer,
} = useQuestionRenderContext()

// inQuiz from render.vue  provide('inQuiz', props.inQuiz)
const inQuiz = inject('inQuiz', false)
</script>
