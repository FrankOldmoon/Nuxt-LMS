<template>
    <Render :node="node" />
</template>

<script setup>
import Render from '../../vue/mindmap/render.vue'

defineProps({
    node: Object,
})
</script>
