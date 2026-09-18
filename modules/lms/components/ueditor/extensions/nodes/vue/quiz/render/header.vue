<template>
    <!-- 测验标题 + 信息 -->
    <div class="flex items-center gap-3 mb-3">
        <span class="px-2 py-0.5 bg-amber-50 dark:bg-amber-800 text-amber-600 dark:text-amber-300 rounded text-xs font-medium">
            {{ t('quiz.label') }}
        </span>
        <span class="font-semibold text-gray-800 dark:text-gray-200">{{ quiz.name }}</span>
        <span v-if="quizId" class="text-xs text-gray-400">#{{ quizId }}</span>
        <div class="flex items-center gap-2 ml-auto">
            <UButton v-if="isTeacher" icon="i-lucide-edit" variant="ghost" size="2xs"
                class="opacity-50 hover:opacity-100 transition-opacity"
                @click="editOpen = true" />
            <UButton v-if="moduleLms && isTeacher" icon="i-heroicons-clipboard" variant="ghost" size="2xs"
                class="opacity-50 hover:opacity-100 transition-opacity" @click="recordsOpen = true" />
            <span class="text-xs text-gray-400">{{ quiz.point }}{{ t('question.points') }}</span>
        </div>
    </div>

    <!-- 开始/结束时间提示 -->
    <div v-if="quiz.startAt || quiz.endAt" class="flex flex-wrap gap-3 mb-3 text-xs text-gray-500">
        <span v-if="quiz.startAt" class="flex items-center gap-1">
            <UIcon name="i-lucide-calendar-start" class="size-3" />
            {{ t('quiz.startAt') }}: {{ formatDateTime(quiz.startAt) }}
        </span>
        <span v-if="quiz.endAt" class="flex items-center gap-1">
            <UIcon name="i-lucide-calendar-end" class="size-3" />
            {{ t('quiz.endAt') }}: {{ formatDateTime(quiz.endAt) }}
        </span>
    </div>

    <!-- 测验内容 -->
    <div v-if="quiz.content" class="prose prose-sm dark:prose-invert max-w-none mb-3">
        <ueditorRender :json="quiz.content" />
    </div>

    <!-- 已提交记录 -->
    <div v-if="userRecord"
        class="mb-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md">
        <div class="flex items-center gap-2 mb-1">
            <UIcon name="i-heroicons-check-circle" class="size-5 text-green-500" />
            <span class="text-sm font-medium text-green-700 dark:text-green-300">
                {{ t('quiz.submitted') }}: {{ userRecord.score }} / {{ quiz.point }}{{ t('question.points') }}
            </span>
        </div>
        <div class="text-xs text-gray-500">{{ t('quiz.submitCount', { n: userRecord.submitCount }) }}</div>
    </div>

    <!-- 超时未提交：本次作答作废（未持久化），可重试 -->
    <div v-if="expiredUnsubmitted"
        class="mb-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-md">
        <div class="flex items-center gap-2 mb-1">
            <UIcon name="i-heroicons-clock" class="size-5 text-orange-500" />
            <span class="text-sm font-medium text-orange-700 dark:text-orange-300">
                {{ t('quiz.expiredNotSubmitted') }}
            </span>
        </div>
        <div class="text-xs text-gray-500">{{ t('quiz.submitCount', { n: expiredRecord.submitCount }) }}</div>
    </div>

    <!-- 未开始：显示开始按钮或等待提示 -->
    <div v-if="!started && !userRecord && !expiredUnsubmitted" class="flex flex-col items-center gap-3 py-6">
        <UButton v-if="canStart && quizQuestions.length > 0" color="primary" size="lg" icon="i-lucide-play"
            :label="t('quiz.start')" @click="startQuiz" />
        <p v-else-if="quizQuestions.length === 0" class="text-sm text-gray-400">{{ t('quiz.noQuestions') }}</p>
        <p v-else class="text-sm text-gray-400">{{ notStartedReason }}</p>
    </div>

    <!-- 已提交/超时且可重试：显示重新开始按钮 -->
    <div v-if="(userRecord || expiredUnsubmitted) && canRetry && !started" class="flex justify-center py-4">
        <UButton color="primary" variant="outline" icon="i-lucide-rotate-ccw" :label="t('quiz.retry')"
            @click="startQuiz" />
    </div>
</template>

<script setup>
import { useQuizRenderContext } from '../useQuizRender'

const {
    t, quiz, quizId, isTeacher, moduleLms, editOpen, recordsOpen,
    userRecord, expiredRecord, expiredUnsubmitted,
    started, quizQuestions, canStart, notStartedReason,
    canRetry, formatDateTime, startQuiz,
} = useQuizRenderContext()
</script>
