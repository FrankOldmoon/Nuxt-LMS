<template>
    <questionView :node="node" />
</template>

<script setup>
import questionView from '../../../render/nodes/vue/question.vue'
const props = defineProps({
    node: Object,
})
</script>
