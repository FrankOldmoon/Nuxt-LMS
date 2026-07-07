<template>
    <Render :node="node" />
</template>

<script setup>
import Render from '../../vue/vfiles/render.vue'

defineProps({
    node: Object,
})
</script>
