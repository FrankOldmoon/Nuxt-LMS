<template>
    <!-- 配置面板 -->
    <div v-if="showConfig" class="vue-node-config">
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

    <!-- 预览（始终显示） -->
    <div class="vue-node-body">
        <div v-if="!config.url" class="flex flex-col items-center justify-center py-10">
            <UIcon name="i-lucide-file-plus" class="size-8 text-gray-300" />
            <p class="text-sm text-gray-400 mt-2">{{ t('ueditor.pdfSelectHint') }}</p>
        </div>
        <UeditorRenderNodesVuePdf v-else :node="node" />
    </div>
</template>

<script setup>
import { nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)
const { t } = useI18n()

const showConfig = inject('nodeViewShowConfig')
const meta = inject('nodeViewMeta')

meta.icon = 'i-lucide-file-text'
meta.hasSettings = true

const parseConfig = () => {
    try {
        const raw = props.node.attrs.content
        if (raw) return JSON.parse(raw)
    } catch (_) { /* noop */ }
    return {}
}
const config = ref(parseConfig())

meta.title = config.value.name || t('ueditor.pdf')
watch(() => config.value.name, (val) => {
    meta.title = val || t('ueditor.pdf')
})

const fileUrl = ref(config.value.url || '')
const configPages = ref(config.value.pages || '')
const configHeight = ref(config.value.height || 800)

watch(showConfig, (val) => {
    if (val) {
        fileUrl.value = config.value.url || ''
        configPages.value = config.value.pages || ''
        configHeight.value = config.value.height || 800
    }
})

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
</script>
