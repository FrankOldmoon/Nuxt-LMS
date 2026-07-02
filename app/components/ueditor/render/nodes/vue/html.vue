<template>
    <div v-html="props.node.attrs.content"></div>
</template>

<script setup>
const props = defineProps({
    node: Object,
})
</script>
