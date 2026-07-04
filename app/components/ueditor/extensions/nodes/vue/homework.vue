<template>
    <div class="vue-node-body">
        <homeworkView :node="node" @init="initID" />
    </div>
</template>

<script setup>
import { nodeViewProps } from '@tiptap/vue-3'
import homeworkView from '../../../render/nodes/vue/homework.vue'

const props = defineProps(nodeViewProps)
const meta = inject('nodeViewMeta')

meta.hasSettings = false

const initID = (id) => {
    props.updateAttributes({ content: id })
}
</script>
