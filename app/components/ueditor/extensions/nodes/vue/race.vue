<template>
    <div class="vue-node-body">
        <raceView :node="node" @init="initID" />
    </div>
</template>

<script setup>
import { nodeViewProps } from '@tiptap/vue-3'
import raceView from '../../../render/nodes/vue/race.vue'

const props = defineProps(nodeViewProps)
const meta = inject('nodeViewMeta')

meta.hasSettings = false

const initID = (id) => {
    props.updateAttributes({ content: id })
}
</script>
