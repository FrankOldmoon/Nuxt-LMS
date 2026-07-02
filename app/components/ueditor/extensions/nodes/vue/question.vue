<template>
    <questionView :node="node" @init="initID"/>
</template>

<script setup>
import questionView from '../../../render/nodes/vue/question.vue'
const props = defineProps({
    node: Object,
    updateAttributes: Function,
})

const initID = (id)=>{
    props.updateAttributes({ content: id })
}
</script>
