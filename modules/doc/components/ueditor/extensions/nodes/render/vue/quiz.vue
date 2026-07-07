<template>
    <Render :node="node" />
</template>

<script setup>
import Render from '../../vue/quiz/render.vue'

defineProps({
    node: Object,
})
</script>
