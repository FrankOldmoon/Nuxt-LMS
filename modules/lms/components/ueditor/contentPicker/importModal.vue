<template>
    <UModal v-model:open="importOpen" fullscreen scrollable>
        <template #content>
            <div class="p-6 space-y-4">
                <h3 class="text-lg font-semibold">{{ t('courseData.importTitle') }}</h3>
                <p class="text-xs text-gray-500">{{ t('courseData.importHint') }}</p>
                <div class="h-[400px]">
                    <Monaco v-model="importJson" language="json" />
                </div>
                <details v-if="currentType === 'question'" class="text-xs">
                    <summary class="cursor-pointer text-gray-500 hover:text-primary py-1 select-none flex items-center gap-2">
                        Question Format Help
                        <UButton icon="i-lucide-copy" size="xs" color="neutral" variant="ghost" @click.stop="copyPrompt" />
                    </summary>
                    <pre class="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg overflow-auto max-h-[300px] text-xs whitespace-pre-wrap border border-gray-200 dark:border-gray-700 leading-relaxed">{{ allPrompts() }}</pre>
                </details>
                <div v-if="importMsg" class="text-xs" :class="importOk ? 'text-green-500' : 'text-red-500'">{{ importMsg }}</div>
                <div class="flex justify-end gap-2">
                    <UButton variant="ghost" @click="importOpen = false">{{ t('common.cancel') }}</UButton>
                    <UButton color="primary" :loading="importing" @click="doImport">{{ t('courseData.import') }}</UButton>
                </div>
            </div>
        </template>
    </UModal>
</template>

<script setup>
import { allPrompts } from '../extensions/nodes/vue/question/edit/prompts.js'
import { useContentPickerContext } from './useContentPicker.js'
const { t, importOpen, importJson, importing, importMsg, importOk, doImport, copyPrompt, currentType } = useContentPickerContext()
</script>
