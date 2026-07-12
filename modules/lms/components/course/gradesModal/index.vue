<template>
    <UModal v-model:open="isOpen" :ui="{ content: 'max-w-6xl' }" scrollable>
        <template #content>
            <div class="p-6 space-y-4 min-w-[700px]">
                <h3 class="text-lg font-semibold">{{ t('coursePanel.grades') }}</h3>

                <ClassUsersTable :rows="rows" :loading="pending" :extra-columns="extraColumns"
                    :hide-actions="true" :hide-teachers="true" :hide-number="true"
                    :default-sort="defaultSort">
                    <!-- group 列 -->
                    <template #group-cell="{ row }">
                        <span class="text-xs text-gray-400">{{ row.original.group ? row.original.group.replace(/^c_/, '') : '-' }}</span>
                    </template>
                    <!-- total 列 -->
                    <template #total-cell="{ row }">
                        <span class="font-mono font-bold" :class="!row.original._hasGrade && 'opacity-40'">
                            {{ row.original.score.toFixed(1) }}
                        </span>
                    </template>
                    <!-- questionScore 列 -->
                    <template #questionScore-cell="{ row }">
                        <span class="font-mono text-xs" :class="!row.original._hasGrade && 'opacity-40'">
                            {{ row.original.questionScore.toFixed(1) }}
                        </span>
                    </template>
                    <!-- homeworkScore 列 -->
                    <template #homeworkScore-cell="{ row }">
                        <span class="font-mono text-xs" :class="!row.original._hasGrade && 'opacity-40'">
                            {{ row.original.homeworkScore.toFixed(1) }}
                        </span>
                    </template>
                    <!-- quizScore 列 -->
                    <template #quizScore-cell="{ row }">
                        <span class="font-mono text-xs" :class="!row.original._hasGrade && 'opacity-40'">
                            {{ row.original.quizScore.toFixed(1) }}
                        </span>
                    </template>
                    <!-- raceScore 列 -->
                    <template #raceScore-cell="{ row }">
                        <span class="font-mono text-xs" :class="!row.original._hasGrade && 'opacity-40'">
                            {{ row.original.raceScore.toFixed(1) }}
                        </span>
                    </template>
                    <!-- commentScore 列 -->
                    <template #commentScore-cell="{ row }">
                        <span class="font-mono text-xs" :class="!row.original._hasGrade && 'opacity-40'">
                            {{ row.original.commentScore.toFixed(1) }}
                        </span>
                    </template>
                    <!-- marksScore 列 -->
                    <template #marksScore-cell="{ row }">
                        <span class="font-mono text-xs" :class="!row.original._hasGrade && 'opacity-40'">
                            {{ row.original.marksScore.toFixed(1) }}
                        </span>
                    </template>
                    <!-- exp 列 -->
                    <template #exp-cell="{ row }">
                        <span class="font-mono text-xs" :class="!row.original._hasGrade && 'opacity-40'">
                            {{ row.original.exp }}
                        </span>
                    </template>
                </ClassUsersTable>

                <!-- 学生端：学习数据 + 能力雷达图 -->
                <CourseGradesModalStudentStats v-if="!canEdit" />
            </div>
        </template>
    </UModal>
</template>

<script setup lang="ts">
const props = defineProps({
    courseId: { type: [String, Number], default: '' },
    classId: { type: [String, Number], default: '' },
})

const isOpen = defineModel('open', { default: false })
const { t } = useI18n()

const ctx = useCourseGrades(props, isOpen)
provideGrades(ctx)
const { rows, pending, extraColumns, defaultSort, canEdit } = ctx
</script>
