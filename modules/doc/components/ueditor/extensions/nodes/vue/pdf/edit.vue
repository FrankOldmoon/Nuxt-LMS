<template>
    <UFormField :label="t('ueditor.pdfFile')" size="sm">
        <FormInputFile v-model="fileUrl" :multiple="false" :placeholder="t('ueditor.pdfSelectHint')" />
    </UFormField>
    <UFormField :label="t('ueditor.pdfPages')" size="sm" :hint="t('ueditor.pdfPagesHint')">
        <UInput v-model="configPages" :placeholder="'1-3, 5, 8-10'" size="sm" />
    </UFormField>
    <UFormField :label="t('ueditor.pdfHeight')" size="sm">
        <UInput v-model.number="configHeight" type="number" size="sm" :placeholder="800" />
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
const configPages = ref(props.config?.pages || '')
const configHeight = ref(props.config?.height || 800)

function apply() {
    const newConfig = {
        ...props.config,
        url: fileUrl.value || props.config?.url,
        pages: configPages.value.trim(),
        height: Number(configHeight.value) || 800,
    }
    emit('update:config', newConfig)
    emit('close')
}
</script>
