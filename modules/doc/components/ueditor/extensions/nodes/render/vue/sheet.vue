<template>
    <Render :node="node" />
</template>

<script setup>
import Render from '../../vue/sheet/render.vue'

defineProps({
    node: Object,
})
</script>
