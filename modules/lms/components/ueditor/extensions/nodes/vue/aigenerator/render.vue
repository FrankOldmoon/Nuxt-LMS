<template>
    <div class="aigenerator-render w-full space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
        <!-- TopTitlecolumn + Navigation -->
        <div class="flex items-center gap-3">
            <span class="px-2 py-0.5 bg-purple-50 dark:bg-purple-800 text-purple-600 dark:text-purple-300 rounded text-xs font-medium flex items-center gap-1">
                <UIcon name="i-lucide-sparkles" class="text-xs" />
                {{ typeLabel[currentQuestion?.type] || t('ueditor.aigenerator') }}
            </span>
            <span v-if="currentQuestion" class="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                {{ currentQuestion.name }}
            </span>
            <!-- Navigationindicator -->
            <div v-if="questions.length > 0" class="flex items-center gap-1 ml-auto text-xs text-gray-500">
                <UButton icon="i-lucide-chevron-left" variant="ghost" size="2xs" :disabled="currentIndex <= 0"
                    @click="goPrev" />
                <span class="font-mono px-1">{{ currentIndex + 1 }} / {{ questions.length }}</span>
                <UButton icon="i-lucide-chevron-right" variant="ghost" size="2xs" :disabled="generating"
                    @click="goNext" />
            </div>
        </div>

        <!-- Loading -->
        <div v-if="generating && !currentQuestion" class="flex items-center justify-center py-12 text-gray-400">
            <UIcon name="i-lucide-loader-2" class="animate-spin mr-2" />
            <span>{{ t('ueditor.aigeneratorLoading') }}</span>
        </div>

        <!-- Not Started：Show Start Button -->
        <div v-else-if="!started && !currentQuestion"
            class="flex flex-col items-center justify-center py-10 gap-3 text-gray-500">
            <UIcon name="i-lucide-sparkles" class="size-10 text-purple-500" />
            <p class="text-sm">{{ t('ueditor.aigeneratorStartHint') }}</p>
            <UButton icon="i-lucide-play" color="primary" size="md" :disabled="!isLoggedIn"
                @click="onStart">
                {{ t('ueditor.aigeneratorStart') }}
            </UButton>
        </div>

        <!-- Not Logged InTip -->
        <div v-else-if="!isLoggedIn && !currentQuestion" class="flex items-center justify-center py-12 text-gray-400 text-sm">
            <UIcon name="i-lucide-log-in" class="mr-2" />
            <span>{{ t('common.loginRequired') }}</span>
        </div>

        <!-- Error Hint -->
        <div v-if="genError" class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
            <UIcon name="i-lucide-alert-circle" class="shrink-0 mt-0.5" />
            <div class="flex-1">
                <div>{{ genError }}</div>
                <UButton size="xs" variant="soft" color="primary" class="mt-2" @click="retry">
                    {{ t('common.retry') }}
                </UButton>
            </div>
        </div>

        <!-- Question Content（makeuse QuestionRender Component） -->
        <QuestionRender
            v-if="currentQuestion"
            ref="renderRef"
            :question="currentQuestion"
            :node="{ attrs: {} }"
            @submitted="onSubmitted"
        />

        <!-- BottomOperation：Regenerate + Next Question -->
        <div v-if="currentQuestion" class="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <UButton icon="i-lucide-refresh-cw" variant="ghost" size="xs" :disabled="generating"
                @click="regenerate">
                {{ t('ueditor.aigeneratorRegenerate') }}
            </UButton>
            <UButton icon="i-lucide-arrow-right" variant="soft" color="primary" size="xs" class="ml-auto"
                :disabled="generating" :loading="generating" @click="goNext">
                {{ t('ueditor.aigeneratorNext') }}
            </UButton>
        </div>
    </div>
</template>

<script setup>
import QuestionRender from '../question/render.vue'
import { useAiGeneratorRender } from './useAiGeneratorRender'

const props = defineProps({ node: Object })

const {
    t, typeLabel, currentQuestion, questions, currentIndex, generating,
    genError, started, isLoggedIn, renderRef,
    onStart, goPrev, goNext, regenerate, retry, on submitted,
} = useAiGeneratorRender(props)
</script>

<style scoped>
.aigenerator-render {
    width: 100%;
}
</style>
