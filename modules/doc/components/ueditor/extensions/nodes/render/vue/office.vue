<template>
    <Render :node="node" />
</template>

<script setup>
import Render from '../../vue/office/render.vue'

defineProps({
    node: Object,
})
</script>
