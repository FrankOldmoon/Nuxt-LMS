<template>
    <Render :node="node" />
</template>

<script setup>
import Render from '../../vue/condition/render.vue'

defineProps({
    node: Object,
})
</script>
