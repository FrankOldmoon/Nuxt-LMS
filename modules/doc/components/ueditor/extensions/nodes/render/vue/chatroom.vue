<template>
    <Render :node="node" />
</template>

<script setup>
import Render from '../../vue/chatroom/render.vue'

defineProps({
    node: Object,
})
</script>
