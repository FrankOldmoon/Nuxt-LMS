<template>
    <UFormField :label="t('ueditor.aichatTitle')" size="sm">
        <UInput v-model="cfgTitle" :placeholder="t('ueditor.aichatTitlePlaceholder')" size="sm" class="w-full" />
    </UFormField>
    <UFormField :label="t('ueditor.aichatPreset')" size="sm" :hint="t('ueditor.aichatPresetHint')">
        <UTextarea v-model="cfgPreset" :rows="3" size="sm" class="w-full" />
    </UFormField>
    <UFormField :label="t('ueditor.aichatOpening')" size="sm">
        <UTextarea v-model="cfgOpening" :rows="2" size="sm" class="w-full" />
    </UFormField>
    <UFormField :label="t('ueditor.aichatModel')" size="sm">
        <UInput v-model="cfgModel" :placeholder="t('ueditor.aichatModelPlaceholder')" size="sm" class="w-full" />
    </UFormField>
    <UFormField :label="t('ueditor.aichatThinking')" size="sm" :hint="t('ueditor.aichatThinkingHint')">
        <USwitch v-model="cfgThinking" />
    </UFormField>
    <UButton size="xs" color="primary" @click="apply">{{ t('common.save') }}</UButton>
</template>

<script setup>
const props = defineProps({
    config: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:config', 'close'])
const { t } = useI18n()

const cfgTitle = ref(props.config?.title || '')
const cfgPreset = ref(props.config?.preset || '')
const cfgOpening = ref(props.config?.opening || '')
const cfgModel = ref(props.config?.model || '')
const cfgThinking = ref(props.config?.thinking || false)

function apply() {
    const newConfig = {
        ...props.config,
        title: cfgTitle.value,
        preset: cfgPreset.value,
        opening: cfgOpening.value,
        model: cfgModel.value,
        thinking: cfgThinking.value,
    }
    emit('update:config', newConfig)
    emit('close')
}
</script>
