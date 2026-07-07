<template>
    <Render :node="node" @saved="onSaved" />
</template>

<script setup>
import { nodeViewProps } from '@tiptap/vue-3'
import Render from './render.vue'

const props = defineProps(nodeViewProps)

const homeworkId = computed(() => Number(props.node?.attrs?.content) || 0)

// 新建作业时拿到 cid 后通知父节点更新 content 属性
function onSaved(hw) {
    if (hw.cid && Number(hw.cid) !== homeworkId.value) {
        props.updateAttributes({ content: String(hw.cid) })
    }
}
</script>
