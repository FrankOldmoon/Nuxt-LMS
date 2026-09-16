<template>
    <!-- 条件未满足的占位：只显示锁与条件标签，正文内容一个字都不渲染（不做模糊预览） -->
    <div class="condition-locked">
        <div class="condition-locked-body">
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
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
}

.condition-locked-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 8px 0;
}

.condition-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 8px;
    justify-content: center;
}
</style>
