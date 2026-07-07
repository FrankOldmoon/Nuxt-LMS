<template>
    <node-view-wrapper style="display: inline;">
        <UInput v-model="content"></UInput>
    </node-view-wrapper>
</template>

<script setup>
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
const props = defineProps(nodeViewProps)
const content = ref(props.node.attrs.content)

watch(content, () => {
    props.updateAttributes({ content: content.value })
})
</script>