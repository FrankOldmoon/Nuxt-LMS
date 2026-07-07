<template>
    <ClientOnly>
        <UInput v-model="content" class="mx-1"></UInput>
    </ClientOnly>
</template>

<script setup>
const props = defineProps({
    node: Object,
})
const content = ref('')
const emit = defineEmits(['update'])
watch(content, () => {
    emit('update', content.value)
})
</script>