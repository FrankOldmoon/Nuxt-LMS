<template>
    <!-- ====== 顶部：学生得分表 ====== -->
    <div class="mb-4">
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
</template>

<script setup>
const {
    studentRows, scoresLoading, scoreColumns, getScoreClass,
} = useRaceRenderContext()
</script>
