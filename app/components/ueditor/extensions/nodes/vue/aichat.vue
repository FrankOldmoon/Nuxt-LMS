<template>
    <!-- 配置面板 -->
    <div v-if="showConfig" class="vue-node-config">
        <UFormField :label="t('ueditor.aichatTitle')" size="sm">
            <UInput v-model="cfgTitle" :placeholder="t('ueditor.aichatTitlePlaceholder')" size="sm" class="w-full" />
        </UFormField>
        <UFormField :label="t('ueditor.aichatPreset')" size="sm" :hint="t('ueditor.aichatPresetHint')">
            <UTextarea v-model="cfgPreset" :rows="3" size="sm" class="w-full" />
        </UFormField>
        <UFormField :label="t('ueditor.aichatOpening')" size="sm">
            <UTextarea v-model="cfgOpening" :rows="2" size="sm" class="w-full" />
        </UFormField>
        <UFormField :label="t('ueditor.aichatModel')" size="sm">
            <UInput v-model="cfgModel" :placeholder="t('ueditor.aichatModelPlaceholder')" size="sm" class="w-full" />
        </UFormField>
        <UFormField :label="t('ueditor.aichatThinking')" size="sm" :hint="t('ueditor.aichatThinkingHint')">
            <USwitch v-model="cfgThinking" />
        </UFormField>
        <UButton size="xs" color="primary" @click="applyConfig">{{ t('common.save') }}</UButton>
    </div>

    <!-- 预览（始终显示） -->
    <div class="vue-node-body">
        <UeditorRenderNodesVueAichat :node="node" />
    </div>
</template>

<script setup>
import { nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)
const { t } = useI18n()

const showConfig = inject('nodeViewShowConfig')
const meta = inject('nodeViewMeta')

meta.icon = 'i-lucide-bot'
meta.hasSettings = true

const parseConfig = () => {
    try {
        const raw = props.node.attrs.content
        if (raw) return JSON.parse(raw)
    } catch (_) { /* noop */ }
    return {}
}
const config = ref(parseConfig())

// 标题显示在 toolbar
meta.title = config.value.title || t('ueditor.aichat')
watch(() => config.value.title, (val) => {
    meta.title = val || t('ueditor.aichat')
})

const cfgTitle = ref(config.value.title || '')
const cfgPreset = ref(config.value.preset || '')
const cfgOpening = ref(config.value.opening || '')
const cfgModel = ref(config.value.model || '')
const cfgThinking = ref(config.value.thinking || false)

// showConfig 打开时同步临时值
watch(showConfig, (val) => {
    if (val) {
        cfgTitle.value = config.value.title || ''
        cfgPreset.value = config.value.preset || ''
        cfgOpening.value = config.value.opening || ''
        cfgModel.value = config.value.model || ''
        cfgThinking.value = config.value.thinking || false
    }
})

function applyConfig() {
    const newConfig = {
        ...config.value,
        title: cfgTitle.value,
        preset: cfgPreset.value,
        opening: cfgOpening.value,
        model: cfgModel.value,
        thinking: cfgThinking.value,
    }
    config.value = newConfig
    props.updateAttributes({ content: JSON.stringify(newConfig) })
    showConfig.value = false
}
</script>
