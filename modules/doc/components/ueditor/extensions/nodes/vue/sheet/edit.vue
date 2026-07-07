<template>
    <UFormField :label="t('ueditor.sheetHeight')" size="sm">
        <UInput v-model.number="configHeight" type="number" size="sm" :placeholder="300" />
    </UFormField>
    <UButton size="xs" color="primary" @click="apply">{{ t('common.save') }}</UButton>
</template>

<script setup>
const props = defineProps({
    config: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:config', 'close'])
const { t } = useI18n()

const configHeight = ref(props.config?.height || 300)

function apply() {
    emit('update:config', { ...props.config, height: Number(configHeight.value) || 300 })
    emit('close')
}
</script>
