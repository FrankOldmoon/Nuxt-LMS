<template>
    <Render :node="node" />
</template>

<script setup>
import Render from '../../vue/homework/render.vue'

defineProps({
    node: Object,
})
</script>
