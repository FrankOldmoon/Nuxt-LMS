<template>
    <!-- Title -->
    <h2 class="text-lg font-semibold">{{ t('common.edit') }} - {{ form.name || t('homework.namePlaceholder') }}</h2>

    <!-- Name / scoreValue -->
    <div class="flex items-center gap-3">
        <UInput v-model="form.name" :placeholder="t('homework.namePlaceholder')" class="flex-1" size="sm" />
        <UInput v-model.number="form.point" type="number" :placeholder="t('question.pointPlaceholder')" size="sm" class="w-20" />
    </div>

    <!-- Homework Content -->
    <div>
        <label class="text-xs text-gray-500 mb-1 block">{{ t('question.contentLabel') }}</label>
        <richEditor v-model="form.content" />
    </div>

    <!-- AnswerAnalysis -->
    <div>
        <label class="text-xs text-gray-500 mb-1 block">{{ t('question.explanationLabel') }}</label>
        <richEditor v-model="form.explanation" />
    </div>

    <!-- Tag -->
    <div>
        <label class="text-xs text-gray-500 mb-1 block">{{ t('question.tagsLabel') }}</label>
        <UInputTags v-model="form.tags" :placeholder="t('question.tagPlaceholder')" :add-text="t('question.addTag')" />
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
        <UButton variant="soft" @click="reset form">{{ t('common.reset') }}</UButton>
        <UButton v-if="showCancel" variant="soft" @click="$emit('cancel')">{{ t('common.cancel') }}</UButton>
        <UButton color="primary" :loading="saving" @click="saveHomework">{{ t('common.save') }}</UButton>
    </div>
</template>

<script setup>
import { useHomeworkEditContext } from '../useHomeworkEdit'

defineProps({ showCancel: { type: Boolean, default: false } })
defineEmits(['cancel'])

const {
    t, form, saving, saveMsg, saveOk,
    showJsonEditor, jsonText, jsonError,
    resetForm, saveHomework,
} = useHomeworkEditContext()
</script>
