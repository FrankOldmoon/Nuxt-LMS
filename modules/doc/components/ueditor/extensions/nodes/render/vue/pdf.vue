<template>
    <Render :node="node" />
</template>

<script setup>
import Render from '../../vue/pdf/render.vue'

defineProps({
    node: Object,
})
</script>
