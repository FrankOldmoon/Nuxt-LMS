<template>
    <Render :node="node" />
</template>

<script setup>
import Render from '../../vue/html/render.vue'

defineProps({
    node: Object,
})
</script>
