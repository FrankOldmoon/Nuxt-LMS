<template>
    <!-- 配置面板：Markdown 编辑 -->
    <div v-if="showConfig" class="vue-node-config">
        <monaco v-model="markdownText" language="markdown" />
        <div class="flex justify-end gap-2 mt-2">
            <UButton size="xs" color="neutral" variant="outline" @click="showConfig = false">{{ t('common.cancel') }}</UButton>
            <UButton size="xs" color="primary" @click="applyMarkdown">{{ t('common.save') }}</UButton>
        </div>
    </div>

    <!-- 预览（始终显示，实时预览效果） -->
    <div class="vue-node-body">
        <UeditorRenderNodesVueMindmap :node="node" />
    </div>
</template>

<script setup>
import { nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)
const { t } = useI18n()

const showConfig = inject('nodeViewShowConfig')
const meta = inject('nodeViewMeta')

meta.title = t('ueditor.mindmap')
meta.icon = 'i-lucide-network'
meta.hasSettings = true

const markdownText = ref(props.node.attrs.content || '')

// showConfig 打开时重新加载内容
watch(showConfig, (val) => {
    if (val) markdownText.value = props.node.attrs.content || ''
})

function applyMarkdown() {
    props.updateAttributes({ content: markdownText.value })
    showConfig.value = false
}
</script>
