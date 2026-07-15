<template>
    <Monaco v-model="markdownText" language="markdown" />
    <div class="flex justify-end gap-2 mt-2">
        <UButton size="xs" color="neutral" variant="outline" @click="emit('close')">{{ t('common.cancel') }}</UButton>
        <UButton size="xs" color="primary" @click="apply">{{ t('common.save') }}</UButton>
    </div>
</template>

<script setup>
const props = defineProps({
    config: { type: [Object, String], default: '' },
})
const emit = defineEmits(['update:config', 'close'])
const { t } = useI18n()

// mindmap  config Yes markdown charactersstring（Exist node.attrs.content Middle）
const markdownText = ref(typeof props.config === 'string' ? props.config : (props.config?.content || ''))

function apply() {
    emit('update:config', markdownText.value)
    emit('close')
}
</script>
