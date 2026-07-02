<template>
    <homeworkView :node="node" @init="initID" />
</template>

<script setup>
import homeworkView from '../../../render/nodes/vue/homework.vue'
const props = defineProps({
    node: Object,
    updateAttributes: Function,
})

const initID = (id) => {
    props.updateAttributes({ content: id })
}
</script>
