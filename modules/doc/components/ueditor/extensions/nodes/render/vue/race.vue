<template>
    <Render :node="node" />
</template>

<script setup>
import Render from '../../vue/race/render.vue'

defineProps({
    node: Object,
})
</script>
