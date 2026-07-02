<template>
    <UModal v-model:open="open" scrollable fullscreen>
        <template #content>
            <div class="p-6 space-y-4 min-w-[600px]">
                <h2 class="text-lg font-semibold">{{ $t('record.questionRecords') }}</h2>

                <ClassUsersTable :rows="rows" :loading="pending" :extra-columns="extraColumns"
                    :hide-actions="true" :hide-teachers="true" :default-sort="defaultSort">
                    <!-- record 列：显示学生选择/填写的具体内容 + 正确与否 -->
                    <template #record-cell="{ row }">
                        <div class="flex items-start gap-2">
                            <template v-if="row.original.record">
                                <UIcon :name="recordIcon(row.original.record)" class="w-3.5 h-3.5 mt-0.5 shrink-0"
                                    :class="recordIconClass(row.original.record)" />
                                <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                    <span v-for="(ans, idx) in formatUserAnswer(row.original.record)" :key="idx"
                                        class="text-xs px-1.5 py-0.5 rounded"
                                        :class="answerItemClass(row.original.record, idx)">
                                        {{ ans }}
                                    </span>
                                    <span class="text-xs text-gray-400">→ {{ formatCorrectRate(row.original.record) }}</span>
                                </div>
                            </template>
                            <span v-else class="text-xs text-gray-400">-</span>
                        </div>
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
    question: { type: Object, default: null },
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

const extraColumns = computed(() => [{
    id: 'record',
    header: t('record.colRecord'),
    sortingFn: (a, b) => (a.original.record ? 1 : 0) - (b.original.record ? 1 : 0),
}])

const defaultSort = [{ id: 'record', desc: true }]

// 先用缓存学生数据填充 table，再异步合并 records
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
    // 有记录的排前面
    rows.value.sort((a, b) => {
        const aHas = a.record ? 1 : 0
        const bHas = b.record ? 1 : 0
        return bHas - aHas
    })
}

async function fetchRecords() {
    if (!props.courseId || !props.cid) {
        rows.value = []
        return
    }
    // 先用缓存学生数据立即显示 table
    buildRows([])
    pending.value = true
    try {
        const data = await cRequest(`/api/lms/questions/records?course_id=${props.courseId}&cid=${props.cid}`)
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

// 格式化作答内容
function formatUserAnswer(record) {
    const userAns = Array.isArray(record?.records) ? record.records : []
    const q = props.question
    if (!q) return userAns.map(String)
    const type = q.type

    if (type === 'single' || type === 'judge' || type === 'multiple') {
        return userAns.map(idx => String.fromCharCode(65 + Number(idx)))
    }
    return userAns.map(String)
}

function formatCorrectRate(record) {
    const rate = Number(record?.correctRate) || 0
    if (rate >= 1) return `${t('record.correct')} ( ${record.score}分 )`
    if (rate > 0) return `${t('record.partial')} ${Math.round(rate * 100)}% ( ${record.score}分 )`
    return `${t('record.wrong')} ( ${record.score}分 )`
}

function answerItemClass(record, idx) {
    const q = props.question
    if (!q) return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
    const userAns = Array.isArray(record?.records) ? record.records : []
    const answer = Array.isArray(q.answer) ? q.answer : []
    const type = q.type
    const val = userAns[idx]

    if (type === 'single' || type === 'judge' || type === 'multiple') {
        return answer.includes(Number(val))
            ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
    }
    return String(val).trim() === String(answer[idx] || '').trim()
        ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
        : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
}

function recordIconClass(record) {
    const rate = Number(record?.correctRate) || 0
    if (rate >= 1) return 'text-green-500'
    if (rate > 0) return 'text-yellow-500'
    return 'text-red-500'
}

function recordIcon(record) {
    const rate = Number(record?.correctRate) || 0
    if (rate >= 1) return 'i-heroicons-check-circle'
    if (rate > 0) return 'i-heroicons-exclamation-circle'
    return 'i-heroicons-x-circle'
}
</script>
