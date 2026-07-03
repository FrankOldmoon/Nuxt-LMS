<template>
    <node-view-wrapper class="aichat-node-wrapper">
        <div class="aichat-node-container" contenteditable="false">
            <!-- 工具栏 -->
            <div class="aichat-node-toolbar">
                <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-bot" class="text-gray-500" />
                    <span class="text-sm font-medium">{{ config.title || t('ueditor.aichat') }}</span>
                </div>
                <div class="flex items-center gap-1">
                    <UButton icon="i-lucide-settings-2" color="neutral" variant="ghost" size="2xs" @click="toggleConfig" />
                    <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="2xs" @click="deleteNode" />
                </div>
            </div>

            <!-- 配置面板 -->
            <div v-if="showConfig" class="aichat-node-config">
                <UFormField :label="t('ueditor.aichatTitle')" size="sm">
                    <UInput v-model="cfgTitle" :placeholder="t('ueditor.aichatTitlePlaceholder')" size="sm" class="w-full" />
                </UFormField>
                <UFormField :label="t('ueditor.aichatPreset')" size="sm" :hint="t('ueditor.aichatPresetHint')">
                    <UTextarea v-model="cfgPreset" :rows="3" size="sm" class="w-full" />
                </UFormField>
                <UFormField :label="t('ueditor.aichatOpening')" size="sm">
                    <UTextarea v-model="cfgOpening" :rows="2" size="sm" class="w-full" />
                </UFormField>
                <UFormField :label="t('ueditor.aichatApiKey')" size="sm">
                    <UInput v-model="cfgApiKey" type="password" placeholder="sk-..." size="sm" class="w-full" />
                </UFormField>
                <UFormField :label="t('ueditor.aichatApiUrl')" size="sm">
                    <UInput v-model="cfgApiUrl" placeholder="https://api.openai.com/v1" size="sm" class="w-full" />
                </UFormField>
                <UFormField :label="t('ueditor.aichatModel')" size="sm">
                    <UInput v-model="cfgModel" placeholder="gpt-4o-mini" size="sm" class="w-full" />
                </UFormField>
                <UFormField :label="t('ueditor.aichatThinking')" size="sm" :hint="t('ueditor.aichatThinkingHint')">
                    <USwitch v-model="cfgThinking" />
                </UFormField>
                <UButton size="xs" color="primary" @click="applyConfig">{{ t('common.save') }}</UButton>
            </div>

            <!-- 引用渲染端组件（完整聊天交互） -->
            <UeditorRenderNodesVueAichat v-show="!showConfig" :node="node" />
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

const cfgTitle = ref(config.value.title || '')
const cfgPreset = ref(config.value.preset || '')
const cfgOpening = ref(config.value.opening || '')
const cfgApiKey = ref(config.value.apiKey || '')
const cfgApiUrl = ref(config.value.apiUrl || '')
const cfgModel = ref(config.value.model || 'gpt-4o-mini')
const cfgThinking = ref(config.value.thinking || false)

function toggleConfig() {
    cfgTitle.value = config.value.title || ''
    cfgPreset.value = config.value.preset || ''
    cfgOpening.value = config.value.opening || ''
    cfgApiKey.value = config.value.apiKey || ''
    cfgApiUrl.value = config.value.apiUrl || ''
    cfgModel.value = config.value.model || 'gpt-4o-mini'
    cfgThinking.value = config.value.thinking || false
    showConfig.value = !showConfig.value
}

function applyConfig() {
    const newConfig = {
        ...config.value,
        title: cfgTitle.value,
        preset: cfgPreset.value,
        opening: cfgOpening.value,
        apiKey: cfgApiKey.value,
        apiUrl: cfgApiUrl.value,
        model: cfgModel.value || 'gpt-4o-mini',
        thinking: cfgThinking.value,
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
.aichat-node-container {
    border: 1px solid var(--umo-content-node-border, #e5e7eb);
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
}
.aichat-node-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
}
.aichat-node-config {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    background: #f3f4f6;
}
</style>
