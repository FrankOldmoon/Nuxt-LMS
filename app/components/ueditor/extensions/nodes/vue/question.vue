<template>
    <div class="vue-node-body">
        <questionView :node="node" @init="initID" />
    </div>
</template>

<script setup>
import { nodeViewProps } from '@tiptap/vue-3'
import questionView from '../../../render/nodes/vue/question.vue'

const props = defineProps(nodeViewProps)
const meta = inject('nodeViewMeta')

// 无设置面板，仅显示删除按钮
meta.hasSettings = false

const initID = (id) => {
    props.updateAttributes({ content: id })
}
</script>
