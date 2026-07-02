<template>
    <div>
        <UInput v-model="html"/>
        <div v-html="html"></div>
    </div>
</template>

<script setup>
const props = defineProps({
    node: Object,
    updateAttributes: Function,
})
const html = ref('')
</script>