<template>
    <Render :node="node" />
</template>

<script setup>
import Render from '../../vue/tabs/render.vue'

defineProps({
    node: Object,
})
</script>
