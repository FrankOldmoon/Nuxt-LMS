<template>
    <Render :node="node" />
</template>

<script setup>
import Render from '../../vue/aigenerator/render.vue'

defineProps({
    node: Object,
})
</script>
