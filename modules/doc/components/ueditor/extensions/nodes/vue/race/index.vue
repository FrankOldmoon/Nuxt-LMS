<template>
    <Render :node="node" @saved="onSaved" />
</template>

<script setup>
import { nodeViewProps } from '@tiptap/vue-3'
import Render from './render.vue'

const props = defineProps(nodeViewProps)

const raceId = computed(() => Number(props.node?.attrs?.content) || 0)

// 新建竞赛时拿到 cid 后通知父节点更新 content 属性
function onSaved(rc) {
    if (rc.cid && Number(rc.cid) !== raceId.value) {
        props.updateAttributes({ content: String(rc.cid) })
    }
}
</script>
