<template>
    <Chatroom :node="node" />
</template>

<script setup>
import Chatroom from './index.vue'

defineProps({
    node: Object,
})
</script>
