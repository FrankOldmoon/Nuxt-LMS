<template>
    <QuestionRender :node="node" />
</template>

<script setup>
import QuestionRender from '../../render/vue/question.vue'

defineProps({
    node: Object,
})
</script>
