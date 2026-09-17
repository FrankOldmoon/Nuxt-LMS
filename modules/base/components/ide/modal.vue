<template>
    <UModal v-model:open="isOpen" :ui="{ content: 'max-w-5xl' }" :portal="portal">
        <template #content>
            <div class="ide-modal-container">
                <Ide v-model="code" :language="language" />
            </div>
        </template>
    </UModal>
</template>

<script setup>
const isOpen = defineModel('open', { default: false })

const props = defineProps({
    code: { type: String, default: '' },
    language: { type: String, default: 'python' },
    // teleport 目标（透传给 UModal）：全屏场景需指向全屏元素，否则 body 级弹窗不可见
    portal: { type: [Boolean, String, Object], default: true },
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
