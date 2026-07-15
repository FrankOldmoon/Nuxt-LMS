<template>
    <div class="space-y-4">
        <!-- Reviewtarget + Progress Bar -->
        <div class="p-4 rounded-lg border border-primary/20 bg-primary/5">
            <div class="flex items-center gap-2 mb-2">
                <UIcon name="i-lucide-target" class="size-5 text-primary" />
                <span class="font-semibold text-highlighted">{{ goal }}</span>
            </div>
            <div class="flex items-center justify-between mb-1.5">
                <span class="text-xs text-muted">{{ $t('question.evaluationProgress') }}</span>
                <span class="text-xs font-semibold" :class="passed ? 'text-success' : 'text-primary'">
                    {{ Math.round(progress * 100) }}%
                </span>
            </div>
            <UProgress :modelValue="progress * 100" />
            <p v-if="passed" class="text-xs text-success mt-2 flex items-center gap-1">
                <UIcon name="i-lucide-check-circle" class="size-3.5" />
                {{ $t('question.evaluationPassed') }}
            </p>
            <p v-else-if="progress > 0" class="text-xs text-muted mt-2">
                {{ $t('question.evaluationNotPassed', { threshold: Math.round(threshold * 100) }) }}
            </p>
        </div>

        <!-- AI Rightdialog evaluation（AI GenerateQuestionby ueditorRender directlyInsideinlineRender） -->
        <AiChatbox
            ref="chatboxRef"
            :title="$t('question.evaluationChatTitle')"
            :preset="systemPrompt"
            :opening="openingMessage"
            :enable-voice-input="true"
            :enable-voice-output="true"
            height-class="h-[400px]"
        />
    </div>
</template>

<script setup>
import { useEvaluation } from './useEvaluation'

const props = defineProps({
    question: { type: Object, required: true },
    questionId: { type: Number, default: 0 },
})

const {
    goal, threshold, progress, passed, hasAnswer, chatboxRef,
    systemPrompt, openingMessage, submit, reset, fillCorrectAnswer,
} = useEvaluation(props)

defineExpose({ submit, reset, hasAnswer, fillCorrectAnswer })
</script>
