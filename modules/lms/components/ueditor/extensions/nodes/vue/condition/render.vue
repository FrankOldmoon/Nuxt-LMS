<template>
    <div class="condition-render-container" :class="{ 'condition-hoverable': needsHoverCheck }"
        @mouseenter="checkCondition">
        <!-- 条件满足时显示内容 -->
        <div v-if="conditionMet && config.content">
            <ueditorRender :json="config.content" />
        </div>

        <!-- 未满足：显示模糊内容 + 条件标签 -->
        <ConditionLocked v-else-if="config.content" :config="config" :format-condition="formatCondition" />

        <!-- 检查中 -->
        <div v-else-if="checking" class="condition-checking">
            <UIcon name="i-lucide-loader-2" class="animate-spin text-gray-400" />
            <span class="text-xs text-gray-400 ml-1">{{ t('ueditor.conditionChecking') }}</span>
        </div>

        <!-- 无内容时的 hover 提示 -->
        <div v-else-if="needsHoverCheck" class="condition-hint">
            <UIcon name="i-lucide-shield-check" class="text-gray-400" />
            <span class="text-xs text-gray-400">{{ t('ueditor.conditionHint') }}</span>
        </div>
    </div>
</template>

<script setup>
import { useConditionRender } from './useConditionRender'
import ConditionLocked from './render/locked.vue'

const props = defineProps({ node: Object })
const { t, config, needsHoverCheck, checking, conditionMet, formatCondition, checkCondition } = useConditionRender(props)
</script>

<style scoped>
.condition-render-container {
    margin: 12px 0;
    padding: 8px;
    border: 1px dashed #e5e7eb;
    border-radius: 8px;
    min-height: 40px;
}

.condition-hoverable {
    cursor: pointer;
}

.condition-hint {
    display: flex;
    align-items: center;
    gap: 4px;
    justify-content: center;
}

.condition-checking {
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>
