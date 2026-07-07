<template>
    <Render :node="node" @saved="onSaved" />
</template>

<script setup>
import { nodeViewProps } from '@tiptap/vue-3'
import Render from './render.vue'

const props = defineProps(nodeViewProps)

const commentId = computed(() => Number(props.node?.attrs?.content) || 0)

// 新建评论时拿到 cid 后通知父节点更新 content 属性
function onSaved(cm) {
    if (cm.cid && Number(cm.cid) !== commentId.value) {
        props.updateAttributes({ content: String(cm.cid) })
    }
}
</script>
