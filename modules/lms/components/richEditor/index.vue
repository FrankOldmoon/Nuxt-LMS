<template>
    <div class="relative w-full">
        <UModal v-model:open="isModalOpen" fullscreen>
            <UButton v-show="false" />
            <template #body>
                <div class="p-6 space-y-4 h-full">
                    <ueditor v-model="editJson" :pasteable="pasteable"/>
                    <div class="flex justify-end gap-2">
                        <UButton variant="soft" @click="() => { isModalOpen = false }">{{ t('common.cancel') }}
                        </UButton>
                        <UButton color="primary" @click="saveJson">{{ t('common.save') }}</UButton>
                    </div>
                </div>
            </template>
        </UModal>
        <!-- 字符串模式：3行文本域 + 右上角半透明书本按钮 + 右下角 markdown 开关 -->
        <div v-if="!isJson" class="relative">
            <UTextarea v-model="model" :rows="3" class="w-full"
                :placeholder="markdown ? t('richEditor.placeholderMd') : t('richEditor.placeholder')" />
            <!-- 富文本编辑弹窗 -->
            <UButton icon="i-heroicons-book-open" variant="ghost" size="sm"
                class="absolute top-0 right-0 opacity-50 hover:opacity-100 transition-opacity z-10"
                :aria-label="t('richEditor.openEditor')" @click="openEditor" />
            <!-- markdown 开关（右下角） -->
            <USwitch v-model="markdown" size="xs" :label="t('richEditor.markdown')"
                class="absolute bottom-1 right-2 opacity-50 hover:opacity-100 transition-opacity z-10" />
        </div>

        <!-- JSON 模式：渲染富文本（可交互） + 右上角编辑按钮（弹 modal 编辑） -->
        <div v-if="isJson" class="relative border rounded-md p-3 min-h-[72px]">
            <ueditorRender :json="model" :markdown="markdown" />
            <div class="absolute top-0 right-0 flex items-center gap-1 z-10">
                <UButton icon="i-heroicons-pencil-square" variant="ghost" size="sm"
                    class="opacity-50 hover:opacity-100 transition-opacity" :aria-label="t('richEditor.openEditor')"
                    @click="openEditor" />
                <UButton v-if="allowTextMode" icon="i-heroicons-book-open" variant="ghost" size="sm"
                    class="opacity-50 hover:opacity-100 transition-opacity" :aria-label="t('richEditor.switchToText')"
                    @click="switchToTextMode" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useRichEditor } from './useRichEditor'

const { t } = useI18n()

const model = defineModel<string | Record<string, any>>({ default: '' })

// 是否开启 markdown：默认开启（字符串按 markdown 解析渲染），可通过 v-model:markdown 双向绑定
const markdown = defineModel('markdown', { type: Boolean, default: true })

const props = defineProps({
    pasteable: {
        type: Boolean,
        default: true,
    },
    allowTextMode: {
        type: Boolean,
        default: true,
    },
})

const { isJson, isModalOpen, editJson, openEditor, saveJson, switchToTextMode } = useRichEditor(props, model, markdown)
</script>
