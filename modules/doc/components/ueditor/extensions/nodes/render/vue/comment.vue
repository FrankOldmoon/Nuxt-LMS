<template>
    <Render :node="node" />
</template>

<script setup>
import Render from '../../vue/comment/render.vue'

defineProps({
    node: Object,
})
</script>
