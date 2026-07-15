<template>
    <div class="space-y-3">
        <!-- sidetoSelect -->
        <div class="flex items-center gap-2">
            <span class="text-xs text-muted whitespace-nowrap">{{ t('ueditor.stepperOrientation') }}</span>
            <USelect v-model="editOrientation" :items="orientationOptions" value-key="value" size="xs" class="w-32" />
        </div>
        <USeparator />
        <!-- stepList：eachitemsstep title(textarea) + description(richEditor) -->
        <div v-for="(step, idx) in editSteps" :key="idx" class="space-y-2 border rounded-md p-2">
            <div class="flex items-start gap-2">
                <span class="text-xs text-muted w-6 text-right pt-1">{{ idx + 1 }}.</span>
                <UTextarea v-model="step.title" :rows="1" autoresize
                    :placeholder="t('ueditor.stepperTitle')" class="flex-1" />
                <UButton icon="i-lucide-x" color="error" variant="ghost" size="xs"
                    :disabled="editSteps.length <= 1"
                    @click="editSteps.splice(idx, 1)" />
            </div>
            <RichEditor v-model="step.description" />
        </div>
        <UButton icon="i-lucide-plus" color="neutral" variant="outline" size="xs"
            :label="t('ueditor.stepperAdd')" @click="editSteps.push({ title: '', description: '' })" />
        <USeparator />
        <UButton size="xs" color="neutral" variant="soft" @click="emit('close')">{{ t('common.save') }}</UButton>
    </div>
</template>

<script setup>
const props = defineProps({
    config: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:config', 'close'])
const { t } = useI18n()

const editOrientation = ref(props.config?.orientation || 'horizontal')
// deep clone to avoid directlyModifyParent Component config Reference
const editSteps = ref(JSON.parse(JSON.stringify(props.config?.steps || [
    { title: '', description: '' },
    { title: '', description: '' },
])))

const orientationOptions = computed(() => [
    { label: t('ueditor.stepperHorizontal'), value: 'horizontal' },
    { label: t('ueditor.stepperVertical'), value: 'vertical' },
])

// real-timeNotificationParent Componentpersist（timer mode：watch + debounce emit）
// debounce to avoid RichEditor Inputfrequently when updateAttributes
let emitTimer = null
watch([editOrientation, editSteps], () => {
    if (emitTimer) clearTimeout(emitTimer)
    emitTimer = setTimeout(() => {
        emit('update:config', {
            orientation: editOrientation.value,
            steps: editSteps.value,
        })
    }, 500)
}, { deep: true })
</script>
