<template>
    <h2 class="text-lg font-semibold">{{ form.name || t('quiz.namePlaceholder') }}</h2>

    <!-- basicConfiguration -->
    <div class="grid grid-cols-2 gap-3">
        <UFormField :label="t('quiz.namePlaceholder')" size="sm">
            <UInput v-model="form.name" :placeholder="t('quiz.namePlaceholder')" size="sm" class="w-full" />
        </UFormField>
        <UFormField :label="t('quiz.timeLimit')" size="sm">
            <UInput v-model.number="form.timeLimit" type="number" size="sm" />
        </UFormField>
        <UFormField :label="t('quiz.submitLimit')" size="sm">
            <UInput v-model.number="form.submitLimit" type="number" size="sm" />
        </UFormField>
        <UFormField :label="t('quiz.totalPoint')" size="sm">
            <UInput :model-value="totalPoint" type="number" size="sm" disabled />
        </UFormField>
        <UFormField :label="t('quiz.startAt')" size="sm">
            <UInput v-model="form.startAt" type="datetime-local" size="sm" />
        </UFormField>
        <UFormField :label="t('quiz.endAt')" size="sm">
            <UInput v-model="form.endAt" type="datetime-local" size="sm" />
        </UFormField>
    </div>

    <!-- QuizContent -->
    <div>
        <label class="text-xs text-gray-500 mb-1 block">{{ t('quiz.contentLabel') }}</label>
        <richEditor v-model="form.content" />
    </div>

    <!-- Question select -->
    <div>
        <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium">{{ t('quiz.questionsLabel') }} ({{ form.questions.length }})</label>
            <UButton size="xs" variant="outline" icon="i-lucide-plus" :label="t('quiz.selectQuestions')" @click="pickerOpen = true" />
        </div>
        <div v-if="form.questions.length" class="space-y-1 max-h-60 overflow-y-auto">
            <div v-for="(q, idx) in form.questions" :key="idx" class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded">
                <UIcon name="i-lucide-circle-help" class="size-4 text-gray-400 shrink-0" />
                <span class="text-sm flex-1">{{ t('courseData.questionLabel') }} #{{ q.id }}</span>
                <UInput v-model.number="q.point" type="number" size="xs" class="w-20" :placeholder="t('quiz.perQuestionPoint')" />
                <span class="text-xs text-gray-400">{{ t('question.points') }}</span>
                <UButton icon="i-lucide-x" color="error" variant="ghost" size="2xs" @click="form.questions.splice(idx, 1)" />
            </div>
        </div>
        <p v-else class="text-sm text-gray-400">{{ t('quiz.no questions') }}</p>
    </div>

    <!-- ========== JSON originalStartDataEditeditor（Highlevel） ========== -->
    <div class="border-t border-gray-100 dark:border-gray-800 pt-3">
        <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
                <UIcon name="i-lucide-braces" class="size-4 text-gray-500" />
                <span class="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {{ t('question.jsonEditor') }}
                </span>
                <span v-if="showJsonEditor" class="text-xs"
                    :class="jsonError ? 'text-red-500' : 'text-green-500'">
                    — {{ jsonError || t('question.jsonValid') }}
                </span>
            </div>
            <UButton size="2xs" variant="ghost"
                :icon="showJsonEditor ? 'i-lucide-eye-off' : 'i-lucide-code'"
                :label="showJsonEditor ? t('common.hide') : t('common.show')"
                @click="showJsonEditor = !showJsonEditor" />
        </div>
        <div v-show="showJsonEditor"
            class="border border-gray-200 dark:border-gray-700 rounded overflow-hidden"
            style="height: 400px;">
            <Monaco v-model="jsonText" language="json" :auto-format="true" />
        </div>
        <p v-if="showJsonEditor" class="text-xs text-gray-400 mt-1">
            {{ t('question.jsonHint') }}
        </p>
    </div>

    <!-- Action button -->
    <div class="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
        <span v-if="saveMsg" class="text-xs self-center" :class="saveOk ? 'text-green-500' : 'text-red-500'">{{ saveMsg }}</span>
        <UButton v-if="showCancel" variant="soft" @click="$emit('cancel')">{{ t('common.cancel') }}</UButton>
        <UButton color="primary" :loading="saving" @click="saveQuiz">{{ t('common.save') }}</UButton>
    </div>
</template>

<script setup>
import { useQuizEditContext } from '../useQuizEdit'

defineProps({ showCancel: { type: Boolean, default: false } })
defineEmits(['cancel'])

const {
    t, form, totalPoint, saving, saveMsg, saveOk,
    showJsonEditor, jsonText, jsonError, pickerOpen, saveQuiz,
} = useQuizEditContext()
</script>
