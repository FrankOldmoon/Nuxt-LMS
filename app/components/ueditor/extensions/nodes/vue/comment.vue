<template>
    <commentView :node="node" @init="initID" />
</template>

<script setup>
import commentView from '../../../render/nodes/vue/comment.vue'
const props = defineProps({
    node: Object,
    updateAttributes: Function,
})

const initID = (id) => {
    props.updateAttributes({ content: id })
}
</script>
