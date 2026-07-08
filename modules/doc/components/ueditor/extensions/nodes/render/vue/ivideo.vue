<template>
    <Render :node="node" />
</template>

<script setup>
import Render from '../../vue/ivideo/render.vue'

defineProps({
    node: Object,
})
</script>
