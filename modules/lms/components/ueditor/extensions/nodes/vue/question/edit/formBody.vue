<template>
    <!-- 标题 -->
    <h2 class="text-lg font-semibold">{{ t('common.edit') }} - {{ form.name || t('question.namePlaceholder') }}</h2>

    <!-- ========== 公共 UI：名称 / 类型 / 分值 ========== -->
    <div class="flex items-center gap-3">
        <UInput v-model="form.name" :placeholder="t('question.namePlaceholder')" class="flex-1" size="sm" />
        <USelect v-model="form.type" :items="typeOptions" size="sm" class="w-32" @change="onTypeChange" />
        <UInput v-model.number="form.point" type="number" :placeholder="t('question.pointPlaceholder')" size="sm" class="w-20" />
    </div>

    <!-- ========== 公共 UI：题目内容 ========== -->
    <div v-if="form?.type !== 'html' && form?.type !== 'composite' && form?.type !== 'oj'">
        <label class="text-xs text-gray-500 mb-1 block">{{ t('question.contentLabel') }}</label>
        <richEditor v-model="form.content" />
    </div>

    <!-- ========== 题型特定组件 ========== -->
    <component :is="typeComponent" v-if="typeComponent" :form="form" />

    <!-- ========== 公共 UI：答案解析 ========== -->
    <div>
        <label class="text-xs text-gray-500 mb-1 block">{{ t('question.explanationLabel') }}</label>
        <richEditor v-model="form.explanation" />
    </div>

    <!-- ========== 公共 UI：标签 ========== -->
    <div>
        <label class="text-xs text-gray-500 mb-1 block">{{ t('question.tagsLabel') }}</label>
        <UInputTags v-model="form.tags" :placeholder="t('question.tagPlaceholder')" :add-text="t('question.addTag')" />
    </div>

    <!-- ========== JSON 原始数据编辑器（高级） ========== -->
    <div class="border-t border-gray-100 dark:border-gray-800 pt-3">
        <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
                <UIcon name="i-lucide-braces" class="size-4 text-gray-500" />
                <span class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ t('question.jsonEditor') }}</span>
                <span v-if="showJsonEditor" class="text-xs" :class="jsonError ? 'text-red-500' : 'text-green-500'">
                    — {{ jsonError || t('question.jsonValid') }}
                </span>
            </div>
            <UButton size="2xs" variant="ghost"
                :icon="showJsonEditor ? 'i-lucide-eye-off' : 'i-lucide-code'"
                :label="showJsonEditor ? t('common.hide') : t('common.show')"
                @click="showJsonEditor = !showJsonEditor" />
        </div>
        <div v-show="showJsonEditor"
            class="border border-gray-200 dark:border-gray-700 rounded overflow-hidden" style="height: 400px;">
            <Monaco v-model="jsonText" language="json" :auto-format="!aiStreaming" />
        </div>
        <p v-if="showJsonEditor" class="text-xs text-gray-400 mt-1">{{ t('question.jsonHint') }}</p>
    </div>

    <!-- ========== AI 出题 ========== -->
    <component v-if="hasTypePrompt" :is="AiGenerator" :type="form.type" @streaming="onAiStreaming" @stream-text="onAiStreamText" @generated="onAiGenerated" />

    <!-- ========== 当前题型的英文出题说明 ========== -->
    <details v-if="currentTypePrompt" class="text-xs">
        <summary class="cursor-pointer text-gray-500 hover:text-primary py-1 select-none flex items-center gap-2">
            <UIcon name="i-lucide-file-text" class="size-3.5" />
            <span>{{ t('question.typePrompt') }}</span>
            <span class="text-gray-400">— {{ t('question.typePromptHint') }}</span>
            <UButton size="2xs" variant="ghost"
                :icon="copyCopied ? 'i-lucide-check' : 'i-lucide-copy'"
                :color="copyCopied ? 'success' : 'neutral'"
                :label="t('question.typePromptCopy')" class="ml-auto"
                @click.stop.prevent="copyCurrentPrompt" />
        </summary>
        <pre class="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg overflow-auto max-h-[300px] text-xs whitespace-pre-wrap border border-gray-200 dark:border-gray-700 leading-relaxed">{{ currentTypePrompt }}</pre>
    </details>

    <!-- ========== 公共 UI：操作按钮 ========== -->
    <div class="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
        <span v-if="saveMsg" class="text-xs self-center" :class="saveOk ? 'text-green-500' : 'text-red-500'">{{ saveMsg }}</span>
        <UButton variant="soft" @click="resetForm">{{ t('common.reset') }}</UButton>
        <UButton v-if="showCancel" variant="soft" @click="$emit('cancel')">{{ t('common.cancel') }}</UButton>
        <UButton color="primary" :loading="saving" @click="saveQuestion">{{ t('common.save') }}</UButton>
    </div>
</template>

<script setup>
defineProps({ showCancel: { type: Boolean, default: false } })
defineEmits(['cancel'])
import { useQuestionEditContext } from '../useQuestionEdit'
const {
    t, form, typeOptions, typeComponent, saving, saveMsg, saveOk,
    showJsonEditor, jsonText, jsonError, aiStreaming,
    currentTypePrompt, hasTypePrompt, copyCopied,
    AiGenerator, onTypeChange, resetForm, copyCurrentPrompt,
    saveQuestion, onAiStreaming, onAiStreamText, onAiGenerated,
} = useQuestionEditContext()
</script>
