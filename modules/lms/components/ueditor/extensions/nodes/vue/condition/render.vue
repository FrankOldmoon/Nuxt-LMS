<template>
    <div class="condition-render-container" :class="{ 'condition-hoverable': needsHoverCheck }"
        @mouseenter="checkCondition">
        <!-- 条件满足时显示内容；内容下方仍标注解锁条件，便于读者了解该内容的可见范围 -->
        <div v-if="conditionMet && config.content">
            <ueditorRender :json="config.content" />
            <div v-if="config.conditions?.length" class="condition-tags condition-tags-met">
                <span class="condition-tags-label">{{ t('ueditor.condition') }}</span>
                <UBadge v-for="(c, i) in config.conditions" :key="i" variant="subtle" size="sm">
                    {{ formatCondition(c) }}
                </UBadge>
            </div>
        </div>

        <!-- 检查中：优先于锁定占位，否则该状态永远不可达 -->
        <div v-else-if="checking" class="condition-checking">
            <UIcon name="i-lucide-loader-2" class="animate-spin text-gray-400" />
            <span class="text-xs text-gray-400 ml-1">{{ t('ueditor.conditionChecking') }}</span>
        </div>

        <!-- 未满足：只显示条件占位，内容完全不渲染 -->
        <ConditionLocked v-else-if="config.content" :config="config" :format-condition="formatCondition" />

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

.condition-tags {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
}

.condition-tags-met {
    margin-top: 8px;
    padding-top: 6px;
    border-top: 1px dashed #e5e7eb;
}

.condition-tags-label {
    font-size: 12px;
    color: #9ca3af;
}
</style>
