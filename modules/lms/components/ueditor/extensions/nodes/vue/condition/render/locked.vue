<template>
    <div class="condition-locked">
        <div class="condition-locked-content">
            <ueditorRender :json="config.content" />
        </div>
        <div class="condition-locked-overlay">
            <UIcon name="i-lucide-lock" class="size-5 text-gray-400" />
            <span class="text-xs text-gray-400 mt-1">{{ t('ueditor.conditionDenied') }}</span>
            <div v-if="config.conditions?.length" class="condition-tags">
                <UBadge v-for="(c, i) in config.conditions" :key="i" variant="subtle" size="sm">
                    {{ formatCondition(c) }}
                </UBadge>
            </div>
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    config: { type: Object, default: () => ({}) },
    formatCondition: { type: Function, required: true },
})
const { t } = useI18n()
</script>

<style scoped>
.condition-locked {
    position: relative;
}

.condition-locked-content {
    filter: blur(4px);
    user-select: none;
    pointer-events: none;
}

.condition-locked-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 8px;
    pointer-events: none;
}

.condition-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 8px;
    justify-content: center;
}
</style>
