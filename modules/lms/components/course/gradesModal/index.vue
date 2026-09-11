<template>
    <UModal v-model:open="isOpen" :ui="{ content: 'max-w-6xl' }" scrollable>
        <template #content>
            <div class="p-6 space-y-4 min-w-[700px]">
                <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold">{{ t('coursePanel.grades') }}</h3>
                    <LmsClassSelector v-if="canEdit" :course-id="courseId" />
                </div>

                <!-- 评分标准：可收缩配置（教师/管理员） / 学生只读展示 -->
                <CourseGradesModalCriteria v-if="canEdit" />
                <CourseGradesModalStudentCriteria v-else />

                <ClassUsersTable :rows="rows" :loading="pending" :extra-columns="extraColumns"
                    :hide-actions="true" :hide-teachers="true" :hide-number="true"
                    :default-sort="defaultSort">
                    <!-- group 列 -->
                    <template #group-cell="{ row }">
                        <span class="text-xs text-gray-400">{{ row.original.group ? row.original.group.replace(/^c_/, '') : '-' }}</span>
                    </template>
                    <!-- grade 列：字母等第 -->
                    <template #grade-cell="{ row }">
                        <span class="font-bold text-base" :class="[gradeLetterClass(computeGrade(row.original).letter), !row.original._hasGrade && 'opacity-40']">
                            {{ computeGrade(row.original).letter }}
                        </span>
                    </template>
                    <!-- total 列：最终分（按满分+占比加权后的百分制分数） -->
                    <template #total-cell="{ row }">
                        <span class="font-mono font-bold" :class="!row.original._hasGrade && 'opacity-40'">
                            {{ computeGrade(row.original).finalScore.toFixed(1) }}
                        </span>
                    </template>
                    <!-- progress 列：章节通过比（0~100%） -->
                    <template #progress-cell="{ row }">
                        <div class="flex items-center gap-1.5" :class="!row.original._hasGrade && 'opacity-40'">
                            <div class="w-12 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                <div class="h-full rounded-full transition-all"
                                    :class="progressColor(row.original.progress)"
                                    :style="{ width: `${Math.min(100, row.original.progress)}%` }" />
                            </div>
                            <span class="font-mono text-xs">{{ row.original.progress }}%</span>
                        </div>
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
                    <!-- commentScore 列 -->
                    <template #commentScore-cell="{ row }">
                        <span class="font-mono text-xs" :class="!row.original._hasGrade && 'opacity-40'">
                            {{ row.original.commentScore.toFixed(1) }}
                        </span>
                    </template>
                    <!-- attitudeScore 列 -->
                    <template #attitudeScore-cell="{ row }">
                        <span class="font-mono text-xs" :class="!row.original._hasGrade && 'opacity-40'">
                            {{ row.original.attitudeScore.toFixed(1) }}
                        </span>
                    </template>
                    <!-- externalScore 列：教师可输入并保存，学生只读 -->
                    <template #externalScore-cell="{ row }">
                        <UInput v-if="canEdit" v-model.number="externalScoreDraft[row.original.id]" type="number"
                            size="xs" class="w-20" :loading="externalScoreSaving === row.original.id"
                            @blur="onExternalScoreBlur(row.original)" @keydown.enter="onExternalScoreEnter($event)" />
                        <span v-else class="font-mono text-xs" :class="!row.original._hasGrade && 'opacity-40'">
                            {{ Number(row.original.externalScore || 0).toFixed(1) }}
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
const { rows, pending, extraColumns, defaultSort, canEdit, computeGrade, saveExternalScore, externalScoreSaving } = ctx

// externalScore 草稿：用本地 ref 跟踪输入值，blur/enter 时提交保存
const externalScoreDraft = ref<Record<number, number | string>>({})
// 弹窗重新打开时清空草稿，让 watch(rows) 重新从服务端数据填充
watch(isOpen, (val) => {
    if (val) externalScoreDraft.value = {}
})
watch(rows, (newRows) => {
    // 仅当行有真实成绩数据（_hasGrade）且草稿未填充时同步服务端值
    // 避免 buildRows([]) 占位数据（externalScore=0, _hasGrade=false）覆盖真实值
    for (const r of newRows) {
        if (r._hasGrade && externalScoreDraft.value[r.id] === undefined) {
            externalScoreDraft.value[r.id] = Number(r.externalScore || 0)
        }
    }
}, { immediate: true })

async function onExternalScoreBlur(row: any) {
    const val = Number(externalScoreDraft.value[row.id])
    if (isNaN(val)) return
    // 值未变化则跳过
    if (val === Number(row.externalScore || 0)) return
    await saveExternalScore(row.id, val)
}

function onExternalScoreEnter(e: KeyboardEvent) {
    ;(e.target as HTMLInputElement).blur()
}

// 等第字母颜色映射
function gradeLetterClass(letter: string) {
    switch (letter) {
        case 'A': return 'text-green-600 dark:text-green-300'
        case 'B': return 'text-blue-600 dark:text-blue-300'
        case 'C': return 'text-amber-600 dark:text-amber-300'
        case 'D': return 'text-orange-600 dark:text-orange-300'
        case 'F': return 'text-red-500 dark:text-red-300'
        default: return 'text-gray-400'
    }
}

// 进度条颜色：0~33 红、34~66 琥珀、67~100 绿
function progressColor(p: number) {
    if (p >= 67) return 'bg-green-500'
    if (p >= 34) return 'bg-amber-500'
    return 'bg-red-500'
}
</script>
