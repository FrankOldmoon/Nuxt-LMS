<template>
    <UModal v-model:open="open" scrollable fullscreen>
        <template #content>
            <div class="p-6 space-y-4 min-w-[600px]">
                <h2 class="text-lg font-semibold">{{ $t('record.quizRecords') }}</h2>

                <ClassUsersTable :rows="rows" :loading="pending" :extra-columns="extraColumns"
                    :hide-actions="true" :hide-teachers="true" :default-sort="defaultSort">
                    <!-- 得分列 -->
                    <template #score-cell="{ row }">
                        <div class="flex items-center gap-2">
                            <template v-if="row.original.record">
                                <span class="text-sm font-medium"
                                    :class="scoreClass(row.original.record)">
                                    {{ row.original.record.score }} / {{ quizPoint }}
                                </span>
                            </template>
                            <span v-else class="text-xs text-gray-400">-</span>
                        </div>
                    </template>
                    <!-- 提交次数列 -->
                    <template #submitCount-cell="{ row }">
                        <span v-if="row.original.record" class="text-xs">
                            {{ row.original.record.submitCount || 0 }}
                        </span>
                        <span v-else class="text-xs text-gray-400">-</span>
                    </template>
                    <!-- 正确率列 -->
                    <template #correctRate-cell="{ row }">
                        <div v-if="row.original.record" class="flex items-center gap-1">
                            <UIcon :name="rateIcon(row.original.record)" class="w-3.5 h-3.5 shrink-0"
                                :class="rateIconClass(row.original.record)" />
                            <span class="text-xs">{{ formatRate(row.original.record) }}</span>
                        </div>
                        <span v-else class="text-xs text-gray-400">-</span>
                    </template>
                </ClassUsersTable>
            </div>
        </template>
    </UModal>
</template>

<script setup>
const props = defineProps({
    modelValue: { type: Boolean, default: false },
    courseId: { type: Number, default: 0 },
    cid: { type: Number, default: 0 },
    quizPoint: { type: Number, default: 100 },
})

const emit = defineEmits(['update:modelValue'])

const { t } = useI18n()
const { students, fetchUsers, currentClassId } = useClassUsers()

const open = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
})

const rows = ref([])
const pending = ref(false)

const extraColumns = computed(() => [
    {
        id: 'score',
        header: t('quiz.score'),
    },
    {
        id: 'correctRate',
        header: t('quiz.correctRate'),
    },
    {
        id: 'submitCount',
        header: t('quiz.submitLimit'),
    },
])

const defaultSort = [{ id: 'score', desc: true }]

function buildRows(recordsData) {
    const recordMap = new Map((recordsData || []).map(r => [r.userId, r.record]))
    rows.value = students.value.map(s => ({
        id: s.id,
        name: s.name,
        preferName: s.preferName,
        rollNumber: s.rollNumber,
        avatarImg: s.avatarImg,
        record: recordMap.get(s.id) || null,
    }))
    // 有记录的排前面，按分数降序
    rows.value.sort((a, b) => {
        const aHas = a.record ? 1 : 0
        const bHas = b.record ? 1 : 0
        if (bHas !== aHas) return bHas - aHas
        if (aHas && bHas) {
            return (Number(b.record.score) || 0) - (Number(a.record.score) || 0)
        }
        return 0
    })
}

async function fetchRecords() {
    if (!props.courseId || !props.cid) {
        rows.value = []
        return
    }
    buildRows([])
    pending.value = true
    try {
        const data = await cRequest(`/api/lms/quizzes/records?course_id=${props.courseId}&cid=${props.cid}`)
        buildRows(data)
    } catch {
        rows.value = []
    } finally {
        pending.value = false
    }
}

watch(open, (val) => {
    if (val) fetchRecords()
})

function scoreClass(record) {
    const score = Number(record.score) || 0
    const passScore = props.quizPoint * 0.6
    if (score >= passScore) return 'text-green-600 dark:text-green-300'
    return 'text-red-600 dark:text-red-300'
}

function formatRate(record) {
    const score = Number(record.score) || 0
    const rate = props.quizPoint > 0 ? score / props.quizPoint : 0
    return `${Math.round(rate * 100)}%`
}

function rateIcon(record) {
    const score = Number(record.score) || 0
    const rate = props.quizPoint > 0 ? score / props.quizPoint : 0
    if (rate >= 0.6) return 'i-heroicons-check-circle'
    if (rate > 0) return 'i-heroicons-exclamation-circle'
    return 'i-heroicons-x-circle'
}

function rateIconClass(record) {
    const score = Number(record.score) || 0
    const rate = props.quizPoint > 0 ? score / props.quizPoint : 0
    if (rate >= 0.6) return 'text-green-500'
    if (rate > 0) return 'text-yellow-500'
    return 'text-red-500'
}
</script>
