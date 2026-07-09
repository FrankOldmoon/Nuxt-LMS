<template>
    <div class="flex items-center gap-3">
        <UFormField :label="$t('chapter.minutes')" size="xs">
            <UInput v-model.number="cfgMinutes" type="number" min="0" max="180" size="sm" class="w-24" />
        </UFormField>
        <UFormField :label="$t('chapter.seconds')" size="xs">
            <UInput v-model.number="cfgSeconds" type="number" min="0" max="59" size="sm" class="w-24" />
        </UFormField>
        <UButton size="xs" color="neutral" variant="soft" @click="emit('close')">{{ $t('common.save') }}</UButton>
    </div>
</template>

<script setup>
const props = defineProps({
    config: { type: Object, default: () => ({ minutes: 1, seconds: 0 }) },
})
const emit = defineEmits(['update:config', 'close'])

const cfgMinutes = ref(props.config?.minutes ?? 1)
const cfgSeconds = ref(props.config?.seconds ?? 0)

// 分秒变化时立即通知父组件持久化（实时预览）
watch([cfgMinutes, cfgSeconds], () => {
    const m = Math.max(0, Math.min(180, Number(cfgMinutes.value) || 0))
    const s = Math.max(0, Math.min(59, Number(cfgSeconds.value) || 0))
    emit('update:config', { minutes: m, seconds: s })
})
</script>
