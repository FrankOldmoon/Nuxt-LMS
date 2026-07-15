<template>
    <div class="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-2">
        <!-- Title -->
        <div class="flex items-center gap-2">
            <UIcon name="i-lucide-sparkles" class="size-4 text-purple-500" />
            <span class="text-xs font-medium text-gray-700 dark:text-gray-300">
                {{ $t('question.aiGenerateTitle') }}
            </span>
            <span class="text-xs text-gray-400">— {{ $t('question.aiGenerateHint') }}</span>
        </div>

        <!-- knowledgeRangeInput + GenerateButton -->
        <div class="flex gap-2">
            <UInput
                v-model="scope"
                :placeholder="$t('question.aiGenerateScopePlaceholder')"
                size="sm"
                class="flex-1"
                :disabled="generating"
                @keydown.enter="onGenerate"
            />
            <UButton
                icon="i-lucide-sparkles"
                color="primary"
                size="sm"
                :loading="generating"
                :disabled="generating"
                @click="onGenerate"
            >
                {{ $t('question.aiGenerateBtn') }}
            </UButton>
            <UButton
                v-if="generating"
                icon="i-lucide-square"
                color="error"
                variant="soft"
                size="sm"
                @click="onStop"
            >
                {{ $t('common.stop') }}
            </UButton>
        </div>

        <!-- Statuslines（streaming output real-timeShowParent Component JSON Monaco Middle） -->
        <div v-if="generating || done" class="flex items-center gap-1 text-xs text-gray-500">
            <UIcon v-if="generating" name="i-lucide-loader-2" class="animate-spin size-3.5" />
            <UIcon v-else-if="genError" name="i-lucide-alert-circle" class="size-3.5 text-red-500" />
            <UIcon v-else-if="stopped" name="i-lucide-square" class="size-3.5 text-gray-400" />
            <UIcon v-else name="i-lucide-check-circle" class="size-3.5 text-green-500" />
            <span>{{ generating ? $t('question.aiGenerateStreaming') : (genError ? $t('question.aiGenerateFailed') : (stopped ? $t('question.aiGenerateStopped') : $t('question.aiGenerateDone'))) }}</span>
        </div>

        <!-- Error Hint -->
        <div v-if="genError" class="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
            <UIcon name="i-lucide-alert-circle" class="shrink-0 mt-0.5" />
            <span class="flex-1">{{ genError }}</span>
        </div>
    </div>
</template>

<script setup>
import { useAiGenerator } from './useAiGenerator'

const props = defineProps({
    // Currentquestion type（useinselectRightshould prompt andAnalysisCheck）
    type: { type: String, required: true },
})
// streaming: streamingStatus（Start/End）  streamText: strip fencesBackpure JSON snippet  generated: AnalysisCompleteQuestionObject
const emit = defineEmits(['streaming', 'streamText', 'generated'])

const { scope, generating, done, stopped, genError, onGenerate, onStop } = useAiGenerator(props, emit)
</script>
