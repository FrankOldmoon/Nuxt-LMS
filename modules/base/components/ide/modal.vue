<template>
    <UModal v-model:open="isOpen" :ui="{ content: 'max-w-5xl' }">
        <template #content>
            <div class="ide-modal-container">
                <Ide v-model="code" />
            </div>
        </template>
    </UModal>
</template>

<script setup>
const isOpen = defineModel('open', { default: false })

const props = defineProps({
    code: { type: String, default: '' },
})

const code = ref(props.code)

watch(() => props.code, (val) => {
    code.value = val
})
</script>

<style scoped>
.ide-modal-container {
    height: 85vh;
    padding: 0;
    overflow: hidden;
}
</style>
