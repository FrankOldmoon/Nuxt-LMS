<template>
    <Edit v-if="showConfig" :config="nodeContent" @update:config="onConfigChange" @close="showConfig = false" />
    <div class="vue-node-body p-2">
        <Render :node="node" />
    </div>
</template>

<script setup>
import { nodeViewProps } from '@tiptap/vue-3'
import Edit from './edit.vue'
import Render from './render.vue'

const props = defineProps(nodeViewProps)

const showConfig = inject('nodeViewShowConfig')
const meta = inject('nodeViewMeta')

meta.title = 'HTML'
meta.icon = 'i-lucide-code'
meta.hasSettings = true

const nodeContent = computed(() => props.node.attrs.content || '')

function onConfigChange(newHtml) {
    props.updateAttributes({ content: newHtml })
}
</script>
