<template>
    <Edit v-if="showConfig" :config="nodeContent" @update:config="onConfigChange" @close="showConfig = false" />
    <div class="vue-node-body">
        <Render :node="node" />
    </div>
</template>

<script setup>
import { nodeViewProps } from '@tiptap/vue-3'
import Edit from './edit.vue'
import Render from './render.vue'

const props = defineProps(nodeViewProps)
const { t } = useI18n()

const showConfig = inject('nodeViewShowConfig')
const meta = inject('nodeViewMeta')

meta.title = t('ueditor.mindmap')
meta.icon = 'i-lucide-network'
meta.hasSettings = true

// mindmap 的 content 是 markdown 字符串（非 JSON）
const nodeContent = computed(() => props.node.attrs.content || '')

function onConfigChange(newContent) {
    props.updateAttributes({ content: newContent })
}
</script>
