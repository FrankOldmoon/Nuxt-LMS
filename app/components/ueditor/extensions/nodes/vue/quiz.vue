<template>
    <quizView :node="node" @init="initID" />
</template>

<script setup>
import quizView from '../../../render/nodes/vue/quiz.vue'
const props = defineProps({
    node: Object,
    updateAttributes: Function,
})

const initID = (id) => {
    props.updateAttributes({ content: id })
}
</script>
