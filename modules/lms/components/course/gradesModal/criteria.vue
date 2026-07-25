<template>
    <!-- 可收缩的评分标准配置（教师/管理员可见） -->
    <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <!-- 折叠头 -->
        <button type="button"
            class="w-full flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            @click="expanded = !expanded">
            <UIcon :name="expanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-4 text-gray-500" />
            <UIcon name="i-lucide-sliders-horizontal" class="size-4 text-primary" />
            <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">{{ t('coursePanel.criteria') }}</span>
            <span class="text-xs text-gray-400 truncate hidden sm:inline">{{ t('coursePanel.criteriaHint') }}</span>
            <span v-if="criteriaDirty" class="ml-auto text-xs text-amber-500 flex items-center gap-1">
                <UIcon name="i-lucide-circle-dot" class="size-3" />
                {{ t('common.unsaved') }}
            </span>
        </button>

        <!-- 展开内容 -->
        <div v-if="expanded" class="p-4 space-y-5">
            <!-- 权重：每项满分 + 占比 -->
            <div>
                <div class="flex items-center justify-between mb-2">
                    <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {{ t('coursePanel.weights') }}
                    </h4>
                    <span class="text-xs font-mono" :class="percentSum === 100 ? 'text-green-500' : 'text-amber-500'">
                        {{ t('coursePanel.percentSum') }}: {{ percentSum }}%
                    </span>
                </div>
                <!-- 表头 -->
                <div class="flex items-center gap-2 px-1 mb-1">
                    <span class="text-xs text-gray-400 flex-1">{{ t('coursePanel.item') }}</span>
                    <span class="text-xs text-gray-400 w-20 text-center">{{ t('coursePanel.maxScore') }}</span>
                    <span class="text-xs text-gray-400 w-16 text-center">{{ t('coursePanel.percent') }}</span>
                    <span class="w-3" />
                </div>
                <div class="space-y-2">
                    <div v-for="w in gradeCriteria.weights" :key="w.key"
                        class="flex items-center gap-2">
                        <label class="text-xs text-gray-600 dark:text-gray-300 flex-1 truncate">
                            {{ t('coursePanel.' + w.key) }}
                        </label>
                        <UInput v-model.number="w.maxScore" type="number" min="0" step="1" size="xs" class="w-20"
                            :placeholder="t('coursePanel.maxScore')" @update:model-value="onDirty" />
                        <UInput v-model.number="w.percent" type="number" min="0" step="1" size="xs" class="w-16"
                            @update:model-value="onDirty" />
                        <span class="text-xs text-gray-400 w-3">%</span>
                    </div>
                </div>
                <p class="text-xs text-gray-400 mt-2">{{ t('coursePanel.weightsHint') }}</p>
            </div>

            <!-- 等第阈值 -->
            <div>
                <div class="flex items-center justify-between mb-2">
                    <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {{ t('coursePanel.levels') }}
                    </h4>
                    <UButton icon="i-lucide-plus" size="xs" variant="ghost" color="primary"
                        :label="t('coursePanel.addLevel')" @click="addLevel" />
                </div>
                <div class="space-y-2">
                    <div v-for="(lvl, idx) in gradeCriteria.levels" :key="idx"
                        class="flex items-center gap-2">
                        <UInput v-model="lvl.letter" :placeholder="t('coursePanel.letter')" size="xs"
                            class="w-20" maxlength="3" @update:model-value="onDirty" />
                        <span class="text-xs text-gray-400">≥</span>
                        <UInput v-model.number="lvl.min" type="number" min="0" step="1" size="xs" class="w-28"
                            @update:model-value="onDirty" />
                        <UButton icon="i-lucide-x" size="xs" variant="ghost" color="error"
                            :disabled="gradeCriteria.levels.length <= 1"
                            @click="removeLevel(Number(idx))" />
                    </div>
                </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
                <UButton icon="i-lucide-save" size="xs" color="primary" :loading="saving"
                    :label="t('common.save')" @click="onSave" />
                <UButton icon="i-lucide-rotate-ccw" size="xs" variant="outline" color="neutral"
                    :label="t('coursePanel.resetCriteria')" @click="onReset" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const { gradeCriteria, criteriaDirty, saveCriteria, resetCriteria } = useGradesContext()

const expanded = ref(false)
const saving = ref(false)

// 各项占比之和（应为 100）
const percentSum = computed(() =>
    gradeCriteria.value.weights.reduce((sum: number, w: any) => sum + (Number(w.percent) || 0), 0),
)

function onDirty() {
    criteriaDirty.value = true
}

function addLevel() {
    gradeCriteria.value.levels.push({ letter: '', min: 0 })
    onDirty()
}

function removeLevel(idx: number) {
    gradeCriteria.value.levels.splice(idx, 1)
    onDirty()
}

async function onSave() {
    saving.value = true
    try {
        await saveCriteria()
    } finally {
        saving.value = false
    }
}

function onReset() {
    resetCriteria()
}
</script>
