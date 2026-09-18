<template>
    <!-- ====== 顶部：学生得分表（默认收起，点击表头展开） ====== -->
    <div class="mb-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <button type="button"
            class="w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            :aria-expanded="open" @click="open = !open">
            <UIcon name="i-lucide-list-ordered" class="size-4 text-gray-400 shrink-0" />
            <span>{{ t('race.scoresTable') }}</span>
            <span class="text-xs text-gray-400">({{ studentRows.length }})</span>
            <UIcon :name="open ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                class="size-4 ml-auto text-gray-400 shrink-0" />
        </button>
        <div v-show="open" class="race-scores-body p-2 border-t border-gray-100 dark:border-gray-800">
            <ClassUsersTable :rows="studentRows" :loading="scoresLoading"
                :hide-actions="true" :hide-teachers="true" :hide-number="true"
                :extra-columns="scoreColumns" :default-sort="[{ id: 'score', desc: true }]"
                show-chart show-online>
                <template #score-cell="{ row }">
                    <span class="text-sm font-bold" :class="getScoreClass(row.original.score)">
                        {{ row.original.score?.toFixed(1) ?? '0' }}
                    </span>
                </template>
                <template #correctCount-cell="{ row }">
                    <span class="text-xs">{{ row.original.correctCount ?? 0 }}</span>
                </template>
            </ClassUsersTable>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRaceRenderContext } from '../useRaceRender'
const {
    t, studentRows, scoresLoading, scoreColumns, getScoreClass,
} = useRaceRenderContext()

// 学生表格默认收起，点击表头展开/收起
const open = ref(false)
</script>
