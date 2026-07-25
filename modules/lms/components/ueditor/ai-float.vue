<template>
    <!-- 仅 teacher 以上角色且编辑器非只读时显示 -->
    <div v-if="visible" class="fixed bottom-14 right-6 z-50 print:hidden">
        <!-- 收起态：悬浮按钮 -->
        <UButton
            v-if="!open"
            icon="i-lucide-sparkles"
            color="primary"
            size="lg"
            class="shadow-lg rounded-full"
            :title="$t('ueditor.aiFloat.title')"
            :aria-label="$t('ueditor.aiFloat.title')"
            @click="openPanel"
        />
        <!-- 展开态：提示词输入面板 -->
        <div v-else class="bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3 w-80 max-w-[calc(100vw-3rem)] space-y-2">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-sparkles" class="size-4 text-purple-500" />
                    <span class="text-sm font-medium">{{ $t('ueditor.aiFloat.title') }}</span>
                </div>
                <UButton icon="i-lucide-x" size="2xs" variant="ghost" :aria-label="$t('common.close')" @click="closePanel" />
            </div>
            <p class="text-xs text-gray-400">{{ $t('ueditor.aiFloat.hint') }}</p>
            <UTextarea class="w-full" v-model="prompt" :placeholder="$t('ueditor.aiFloat.placeholder')" :rows="4" :disabled="generating" autofocus />
            <div class="flex items-center gap-2 flex-wrap">
                <UButton v-if="!generating" icon="i-lucide-sparkles" color="primary" size="sm" :disabled="!prompt.trim()" @click="onGenerate">{{ $t('ueditor.aiFloat.generate') }}</UButton>
                <UButton v-else icon="i-lucide-square" color="error" variant="soft" size="sm" @click="onStop">{{ $t('common.stop') }}</UButton>
                <span v-if="generating" class="text-xs text-gray-500 flex items-center gap-1">
                    <UIcon name="i-lucide-loader-2" class="animate-spin size-3.5" />
                    {{ $t('ueditor.aiFloat.streaming') }}
                </span>
                <span v-else-if="stopped" class="text-xs text-gray-400">{{ $t('ueditor.aiFloat.stopped') }}</span>
                <span v-else-if="done" class="text-xs text-green-500 flex items-center gap-1">
                    <UIcon name="i-lucide-check-circle" class="size-3.5" />
                    {{ $t('ueditor.aiFloat.done') }}
                </span>
            </div>
            <div v-if="genError" class="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded text-xs text-red-700 dark:text-red-300">{{ genError }}</div>
        </div>
    </div>
</template>

<script setup>
import { useAiFloat } from './useAiFloat'
const props = defineProps({
    editor: { type: Object, default: null },
    readonly: { type: Boolean, default: false },
    canInsertQuestion: { type: Boolean, default: false },
})
const { visible, open, prompt, generating, done, stopped, genError, openPanel, closePanel, onGenerate, onStop } = useAiFloat(props)
</script>
