<template>
    <node-view-wrapper class="office-node-wrapper">
        <div class="office-node-container" contenteditable="false">
            <!-- 工具栏 -->
            <div class="office-node-toolbar">
                <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-file-spreadsheet" class="text-gray-500" />
                    <span class="text-sm font-medium truncate">{{ config.name || t('ueditor.office') }}</span>
                </div>
                <div class="flex items-center gap-1">
                    <UButton icon="i-lucide-settings-2" color="neutral" variant="ghost" size="2xs" @click="toggleConfig" />
                    <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="2xs" @click="deleteNode" />
                </div>
            </div>

            <!-- 配置面板 -->
            <div v-if="showConfig" class="office-node-config">
                <UFormField :label="t('ueditor.officeFile')" size="sm">
                    <FormInputFile v-model="fileUrl" :multiple="false" :placeholder="t('ueditor.officeSelectHint')" />
                </UFormField>
                <UFormField :label="t('ueditor.officeHeight')" size="sm">
                    <UInput v-model.number="configHeight" type="number" size="sm" :placeholder="600" />
                </UFormField>
                <UButton size="xs" color="primary" @click="applyConfig">{{ t('common.save') }}</UButton>
            </div>

            <!-- 无文件提示 -->
            <div v-if="!config.url" class="office-node-empty">
                <UIcon name="i-lucide-file-plus" class="size-8 text-gray-300" />
                <p class="text-sm text-gray-400 mt-2">{{ t('ueditor.officeSelectHint') }}</p>
            </div>

            <!-- 引用渲染端组件预览 -->
            <UeditorRenderNodesVueOffice v-else :node="node" />
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
const configHeight = ref(config.value.height || 600)

function toggleConfig() {
    fileUrl.value = config.value.url || ''
    configHeight.value = config.value.height || 600
    showConfig.value = !showConfig.value
}

function applyConfig() {
    const newConfig = {
        ...config.value,
        url: fileUrl.value || config.value.url,
        height: Number(configHeight.value) || 600,
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
.office-node-container {
    border: 1px solid var(--umo-content-node-border, #e5e7eb);
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
}
.office-node-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
}
.office-node-config {
    display: flex;
    align-items: flex-end;
    gap: 12px;
    padding: 12px;
    background: #f3f4f6;
    border-bottom: 1px solid #e5e7eb;
    flex-wrap: wrap;
}
.office-node-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
}
</style>
