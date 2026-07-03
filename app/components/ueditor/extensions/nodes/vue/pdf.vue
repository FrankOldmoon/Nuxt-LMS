<template>
    <node-view-wrapper class="pdf-node-wrapper">
        <div class="pdf-node-container" contenteditable="false">
            <!-- 工具栏 -->
            <div class="pdf-node-toolbar">
                <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-file-text" class="text-gray-500" />
                    <span class="text-sm font-medium truncate">{{ config.name || t('ueditor.pdf') }}</span>
                </div>
                <div class="flex items-center gap-1">
                    <UButton icon="i-lucide-settings-2" color="neutral" variant="ghost" size="2xs" @click="toggleConfig" />
                    <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="2xs" @click="deleteNode" />
                </div>
            </div>

            <!-- 配置面板 -->
            <div v-if="showConfig" class="pdf-node-config">
                <UFormField :label="t('ueditor.pdfFile')" size="sm">
                    <FormInputFile v-model="fileUrl" :multiple="false" :placeholder="t('ueditor.pdfSelectHint')" />
                </UFormField>
                <UFormField :label="t('ueditor.pdfPages')" size="sm" :hint="t('ueditor.pdfPagesHint')">
                    <UInput v-model="configPages" :placeholder="'1-3, 5, 8-10'" size="sm" />
                </UFormField>
                <UFormField :label="t('ueditor.pdfHeight')" size="sm">
                    <UInput v-model.number="configHeight" type="number" size="sm" :placeholder="800" />
                </UFormField>
                <UButton size="xs" color="primary" @click="applyConfig">{{ t('common.save') }}</UButton>
            </div>

            <!-- 无文件提示 -->
            <div v-if="!config.url" class="pdf-node-empty">
                <UIcon name="i-lucide-file-plus" class="size-8 text-gray-300" />
                <p class="text-sm text-gray-400 mt-2">{{ t('ueditor.pdfSelectHint') }}</p>
            </div>

            <!-- 引用渲染端组件预览 -->
            <UeditorRenderNodesVuePdf v-else :node="node" />
        </div>
    </node-view-wrapper>
</template>

<script setup>
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)
const { t } = useI18n()

const showConfig = ref(false)

const parseConfig = () => {
    try {
        const raw = props.node.attrs.content
        if (raw) return JSON.parse(raw)
    } catch (_) { /* noop */ }
    return {}
}
const config = ref(parseConfig())

const fileUrl = ref(config.value.url || '')
const configPages = ref(config.value.pages || '')
const configHeight = ref(config.value.height || 800)

function toggleConfig() {
    fileUrl.value = config.value.url || ''
    configPages.value = config.value.pages || ''
    configHeight.value = config.value.height || 800
    showConfig.value = !showConfig.value
}

function applyConfig() {
    const newConfig = {
        ...config.value,
        url: fileUrl.value || config.value.url,
        pages: configPages.value.trim(),
        height: Number(configHeight.value) || 800,
    }
    config.value = newConfig
    props.updateAttributes({ content: JSON.stringify(newConfig) })
    showConfig.value = false
}

function deleteNode() {
    props.deleteNode()
}
</script>

<style scoped>
.pdf-node-container {
    border: 1px solid var(--umo-content-node-border, #e5e7eb);
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
}
.pdf-node-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
}
.pdf-node-config {
    display: flex;
    align-items: flex-end;
    gap: 12px;
    padding: 12px;
    background: #f3f4f6;
    border-bottom: 1px solid #e5e7eb;
    flex-wrap: wrap;
}
.pdf-node-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
}
</style>
