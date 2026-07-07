<template>
    <Render :node="node" />
</template>

<script setup>
import Render from '../../vue/counter/render.vue'

defineProps({
    node: Object,
})
</script>
