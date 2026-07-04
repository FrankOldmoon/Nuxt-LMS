<template>
    <div class="vue-node-body">
        <quizView :node="node" @init="initID" />
    </div>
</template>

<script setup>
import { nodeViewProps } from '@tiptap/vue-3'
import quizView from '../../../render/nodes/vue/quiz.vue'

const props = defineProps(nodeViewProps)
const meta = inject('nodeViewMeta')

meta.hasSettings = false

const initID = (id) => {
    props.updateAttributes({ content: id })
}
</script>
