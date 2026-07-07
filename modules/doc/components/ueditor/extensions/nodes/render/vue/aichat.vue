<template>
    <Render :node="node" />
</template>

<script setup>
import Render from '../../vue/aichat/render.vue'

defineProps({
    node: Object,
})
</script>
