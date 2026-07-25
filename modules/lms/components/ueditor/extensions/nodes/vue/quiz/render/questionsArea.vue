<template>
    <div class="space-y-3">
        <!-- 进度条计时器 -->
        <div v-if="started" class="space-y-1">
            <div class="flex items-center justify-between text-xs">
                <span :class="remainingTime <= 30 ? 'text-red-500 font-bold' : 'text-gray-500'">
                    <UIcon name="i-lucide-timer" class="size-3.5 inline mr-1" />
                    {{ formatTime(remainingTime) }}
                </span>
                <span class="text-gray-400">{{ t('quiz.timeRemaining') }}</span>
            </div>
            <div class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all duration-1000 ease-linear"
                    :class="remainingTime <= 30 ? 'bg-red-500' : 'bg-primary'"
                    :style="{ width: timeProgress + '%' }" />
            </div>
        </div>

        <!-- 左右布局：左题目选择器 + 右当前题目 -->
        <div class="flex gap-3" style="min-height: 300px;">
            <div class="w-12 shrink-0 flex flex-col gap-1">
                <button v-for="(q, idx) in quizQuestions" :key="q.id"
                    class="w-10 h-10 rounded-lg border-2 flex items-center justify-center text-sm font-medium transition-all relative"
                    :class="getQuestionBtnClass(idx)" @click="switchQuestion(idx)">
                    {{ idx + 1 }}
                </button>
            </div>
            <div class="flex-1 min-w-0 relative">
                <div v-for="(q, idx) in quizQuestions" :key="q.id" v-show="currentIndex === idx"
                    :class="currentIndex === idx ? '' : 'pointer-events-none absolute inset-0 -z-10'">
                    <component :ref="(el) => { if (el) questionRefs[idx] = el }" :is="QuestionRender"
                        :node="{ attrs: { type: 'question', content: String(q.id) } }" :course-id="effectiveCourseId" :in-quiz="true" />
                </div>
            </div>
        </div>

        <!-- 底部提交按钮 + 导航 -->
        <div v-if="started"
            class="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
            <UButton color="success" variant="solid" size="lg" icon="i-lucide-chevron-left"
                :disabled="currentIndex <= 0" @click="switchQuestion(currentIndex - 1)" />
            <div class="flex items-center gap-3">
                <span class="text-xs text-gray-400">{{ answeredCount }} / {{ quizQuestions.length }}</span>
                <UButton color="primary" size="sm" :loading="submitting" @click="confirmSubmit">
                    {{ t('quiz.submit') }}
                </UButton>
            </div>
            <UButton color="success" variant="solid" size="lg" icon="i-lucide-chevron-right"
                :disabled="currentIndex >= quizQuestions.length - 1"
                @click="switchQuestion(currentIndex + 1)" />
        </div>

        <!-- 提交确认弹窗 -->
        <UModal v-model:open="confirmOpen">
            <template #content>
                <div class="p-6 space-y-4">
                    <h3 class="text-lg font-semibold">{{ t('quiz.confirmSubmitTitle') }}</h3>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-500">{{ t('quiz.answeredCount') }}:</span>
                            <span class="font-medium">{{ answeredCount }} / {{ quizQuestions.length }}</span>
                        </div>
                        <p v-if="answeredCount < quizQuestions.length" class="text-xs text-orange-500">
                            {{ t('quiz.unansweredHint') }}
                        </p>
                    </div>
                    <div class="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                        <UButton variant="soft" @click="confirmOpen = false">{{ t('common.cancel') }}</UButton>
                        <UButton color="primary" :loading="submitting" @click="submitQuiz">{{ t('quiz.submit') }}</UButton>
                    </div>
                </div>
            </template>
        </UModal>
    </div>
</template>

<script setup>
import QuestionRender from '../../question/render.vue'
import { useQuizRenderContext } from '../useQuizRender'

const {
    t, effectiveCourseId, started, remainingTime, formatTime, timeProgress,
    quizQuestions, getQuestionBtnClass, switchQuestion, currentIndex,
    questionRefs, answeredCount, submitting, confirmOpen, confirmSubmit, submitQuiz,
} = useQuizRenderContext()
</script>
