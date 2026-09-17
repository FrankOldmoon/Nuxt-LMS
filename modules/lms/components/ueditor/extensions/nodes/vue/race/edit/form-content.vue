<template>
    <!-- 基本配置 -->
    <div class="grid grid-cols-2 gap-3">
        <UFormField :label="t('race.namePlaceholder')" size="sm">
            <UInput v-model="form.name" :placeholder="t('race.namePlaceholder')" size="sm" class="w-full" />
        </UFormField>
        <UFormField :label="t('race.point')" size="sm">
            <UInput v-model.number="form.point" type="number" size="sm" />
        </UFormField>
        <UFormField :label="t('race.gapTime')" size="sm">
            <UInput v-model.number="form.gapTime" type="number" size="sm" />
        </UFormField>
    </div>

    <!-- 题目选择 -->
    <div>
        <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium">{{ t('race.questionsLabel') }} ({{ form.questionIds.length }})</label>
            <UButton size="xs" variant="outline" icon="i-lucide-plus" :label="t('race.selectQuestions')" @click="pickerOpen = true" />
        </div>
        <div v-if="form.questionIds.length" class="space-y-1 max-h-48 overflow-y-auto">
            <div v-for="(q, idx) in form.questionIds" :key="idx" class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded">
                <UIcon name="i-lucide-circle-help" class="size-4 text-gray-400" />
                <span class="text-sm flex-1">{{ t('courseData.questionLabel') }} #{{ q.id }}</span>
                <UButton icon="i-lucide-x" color="error" variant="ghost" size="2xs" @click="form.questionIds.splice(idx, 1)" />
            </div>
        </div>
        <p v-else class="text-sm text-gray-400">{{ t('race.noQuestions') }}</p>
    </div>

    <!-- ========== JSON 原始数据编辑器（高级） ========== -->
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
</template>

<script setup>
import { useRaceEditContext } from '../useRaceEdit'

const {
    t, form, pickerOpen, showJsonEditor, jsonText, jsonError,
} = useRaceEditContext()
</script>
