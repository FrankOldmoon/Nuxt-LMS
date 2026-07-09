<template>
    <div class="vue-node-body">
        <Render :node="node" @update="onRenderUpdate" />
    </div>
</template>

<script setup>
import { nodeViewProps } from '@tiptap/vue-3'
import Render from './render.vue'

const props = defineProps(nodeViewProps)

const meta = inject('nodeViewMeta')

meta.hasSettings = false

function onRenderUpdate(newCount) {
    props.updateAttributes({ content: String(newCount) })
}
</script>
