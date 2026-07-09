<template>
    <UFormField :label="t('ueditor.officeFile')" size="sm">
        <FormInputFile v-model="fileUrl" :multiple="false" :placeholder="t('ueditor.officeSelectHint')" />
    </UFormField>
    <UFormField :label="t('ueditor.officeHeight')" size="sm">
        <UInput v-model.number="configHeight" type="number" size="sm" :placeholder="600" />
    </UFormField>
    <UButton size="xs" color="primary" @click="apply">{{ t('common.save') }}</UButton>
</template>

<script setup>
const props = defineProps({
    config: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:config', 'close'])
const { t } = useI18n()

const fileUrl = ref(props.config?.url || '')
const configHeight = ref(props.config?.height || 600)

function apply() {
    const newConfig = {
        ...props.config,
        url: fileUrl.value || props.config?.url,
        height: Number(configHeight.value) || 600,
    }
    emit('update:config', newConfig)
    emit('close')
}
</script>
