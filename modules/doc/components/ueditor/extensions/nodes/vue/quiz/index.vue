<template>
    <Render :node="node" @saved="onSaved" />
</template>

<script setup>
import { nodeViewProps } from '@tiptap/vue-3'
import Render from './render.vue'

const props = defineProps(nodeViewProps)

const quizId = computed(() => Number(props.node?.attrs?.content) || 0)

// 新建测验时拿到 cid 后通知父节点更新 content 属性
function onSaved(qz) {
    if (qz.cid && Number(qz.cid) !== quizId.value) {
        props.updateAttributes({ content: String(qz.cid) })
    }
}
</script>
