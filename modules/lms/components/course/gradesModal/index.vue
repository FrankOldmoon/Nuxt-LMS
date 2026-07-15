<template>
    <UModal v-model:open="isOpen" :ui="{ content: 'max-w-6xl' }" scrollable>
        <template #content>
            <div class="p-6 space-y-4 min-w-[700px]">
                <h3 class="text-lg font-semibold">{{ t('coursePanel.grades') }}</h3>

                <!-- Rating criteria: collapsible configuration (teacher/admin) / student read-only display -->
                <CourseGradesModalCriteria v-if="canEdit" />
                <CourseGradesModalStudentCriteria v-else />

                <ClassUsersTable :rows="rows" :loading="pending" :extra-columns="extraColumns"
                    :hide-actions="true" :hide-teachers="true" :hide-number="true"
                    :default-sort="defaultSort">
                    <!-- group columns -->
                    <template #group-cell="{ row }">
                        <span class="text-xs text-gray-400">{{ row.original.group ? row.original.group.replace(/^c_/, '') : '-' }}</span>
                    </template>
                    <!-- grade columns: character-based grade -->
                    <template #grade-cell="{ row }">
                        <span class="font-bold text-base" :class="[gradeLetterClass(computeGrade(row.original).letter), !row.original._hasGrade && 'opacity-40']">
                            {{ computeGrade(row.original).letter }}
                        </span>
                    </template>
                    <!-- total columns：mostEndscore（byFullscore+percentageweightedBackpercentageScore） -->
                    <template #total-cell="{ row }">
                        <span class="font-mono font-bold" :class="!row.original._hasGrade && 'opacity-40'">
                            {{ computeGrade(row.original).finalScore.toFixed(1) }}
                        </span>
                    </template>
                    <!-- progress columns：ChapterPassthan（0~100%） -->
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
                    <!-- questionScore columns -->
                    <template #questionScore-cell="{ row }">
                        <span class="font-mono text-xs" :class="!row.original._hasGrade && 'opacity-40'">
                            {{ row.original.questionScore.toFixed(1) }}
                        </span>
                    </template>
                    <!-- homeworkScore columns -->
                    <template #homeworkScore-cell="{ row }">
                        <span class="font-mono text-xs" :class="!row.original._hasGrade && 'opacity-40'">
                            {{ row.original.homeworkScore.toFixed(1) }}
                        </span>
                    </template>
                    <!-- quizScore columns -->
                    <template #quizScore-cell="{ row }">
                        <span class="font-mono text-xs" :class="!row.original._hasGrade && 'opacity-40'">
                            {{ row.original.quizScore.toFixed(1) }}
                        </span>
                    </template>
                    <!-- raceScore columns -->
                    <template #raceScore-cell="{ row }">
                        <span class="font-mono text-xs" :class="!row.original._hasGrade && 'opacity-40'">
                            {{ row.original.raceScore.toFixed(1) }}
                        </span>
                    </template>
                    <!-- commentScore columns -->
                    <template #commentScore-cell="{ row }">
                        <span class="font-mono text-xs" :class="!row.original._hasGrade && 'opacity-40'">
                            {{ row.original.commentScore.toFixed(1) }}
                        </span>
                    </template>
                    <!-- marksScore columns -->
                    <template #marksScore-cell="{ row }">
                        <span class="font-mono text-xs" :class="!row.original._hasGrade && 'opacity-40'">
                            {{ row.original.marksScore.toFixed(1) }}
                        </span>
                    </template>
                    <!-- extraScore columns：TeachercanInputandSave，StudentRead-only -->
                    <template #extraScore-cell="{ row }">
                        <UInput v-if="canEdit" v-model.number="extraScoreDraft[row.original.id]" type="number"
                            size="xs" class="w-20" :loading="extraScoreSaving === row.original.id"
                            @blur="onExtraScoreBlur(row.original)" @keydown.enter="onExtraScoreEnter($event)" />
                        <span v-else class="font-mono text-xs" :class="!row.original._hasGrade && 'opacity-40'">
                            {{ Number(row.original.extraScore || 0).toFixed(1) }}
                        </span>
                    </template>
                </ClassUsersTable>

                <!-- Student：LearningData + canabilityThunderchart -->
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
const { rows, pending, extraColumns, defaultSort, canEdit, computeGrade, saveExtraScore, extraScoreSaving } = ctx

// extraScore Draft：uselocalGround ref TrackInputValue，blur/enter whenSubmitSave
const extraScoreDraft = ref<Record<number, number | string>>({})
// ModalHeavyNewOpenwhenClearDraft，let watch(rows) HeavyNewfromServiceserverDatafill
watch(isOpen, (val) => {
    if (val) extraScoreDraft.value = {}
})
watch(rows, (newRows) => {
    // only whenlinesHasTrueactualScoreData（_hasGrade）andDraftwhen not filledSyncServiceserverValue
    // avoid buildRows([]) placeholderData（extraScore=0, _hasGrade=false）overlayTrueactualValue
    for (const r of newRows) {
        if (r._hasGrade && extraScoreDraft.value[r.id] === undefined) {
            extraScoreDraft.value[r.id] = Number(r.extraScore || 0)
        }
    }
}, { immediate: true })

async function onExtraScoreBlur(row: any) {
    const val = Number(extraScoreDraft.value[row.id])
    if (isNaN(val)) return
    // Valueif not changed thenSkip
    if (val === Number(row.extraScore || 0)) return
    await saveExtraScore(row.id, val)
}

function onExtraScoreEnter(e: KeyboardEvent) {
    ;(e.target as HTMLInputElement).blur()
}

// etc.charactersMotherColorMap
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

// Progress BarColor：0~33 Red、34~66 amber、67~100 Green
function progressColor(p: number) {
    if (p >= 67) return 'bg-green-500'
    if (p >= 34) return 'bg-amber-500'
    return 'bg-red-500'
}
</script>
