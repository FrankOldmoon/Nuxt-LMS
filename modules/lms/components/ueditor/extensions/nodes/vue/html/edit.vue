<template>
    <Monaco v-model="html" language="html" />
    <UButton size="xs" color="primary" class="self-end mt-2" @click="emit('close')">
        {{ t('common.save') }}
    </UButton>
</template>

<script setup>
const props = defineProps({
    config: { type: String, default: '' },
})
const emit = defineEmits(['update:config', 'close'])
const { t } = useI18n()

const html = ref(props.config || '')

// real-time preview：Inputwhenthat isNotificationParent Componentpersist
watch(html, () => {
    emit('update:config', html.value)
})
</script>
