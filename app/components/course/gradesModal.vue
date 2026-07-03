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
                    <!-- exp 列 -->
                    <template #exp-cell="{ row }">
                        <span class="font-mono text-xs" :class="!row.original._hasGrade && 'opacity-40'">
                            {{ row.original.exp }}
                        </span>
                    </template>
                </ClassUsersTable>
            </div>
        </template>
    </UModal>
</template>

<script setup>
const isOpen = defineModel('open', { default: false })
const { t } = useI18n()
const { students, fetchUsers } = useClassUsers()
const auth = useAuth()

const props = defineProps({
    courseId: { type: [String, Number], default: '' },
    classId: { type: [String, Number], default: '' },
})

// 是否可编辑（教师或管理员）
const canEdit = computed(() => {
    if (auth.hasRole('admin')) return true
    return props.courseId ? auth.isCourseTeacher(Number(props.courseId)) : false
})

const rows = ref([])
const pending = ref(false)

// 额外列定义：group + 各项分数
const extraColumns = computed(() => [
    {
        id: 'group',
        header: t('coursePanel.group'),
        sortingFn: (a, b) => String(a.original.group || '').localeCompare(String(b.original.group || '')),
    },
    {
        id: 'total',
        header: t('coursePanel.total'),
        sortingFn: (a, b) => (b.original.score ?? 0) - (a.original.score ?? 0),
    },
    {
        id: 'questionScore',
        header: t('coursePanel.questionScore'),
        sortingFn: (a, b) => (b.original.questionScore ?? 0) - (a.original.questionScore ?? 0),
    },
    {
        id: 'homeworkScore',
        header: t('coursePanel.homeworkScore'),
        sortingFn: (a, b) => (b.original.homeworkScore ?? 0) - (a.original.homeworkScore ?? 0),
    },
    {
        id: 'quizScore',
        header: t('coursePanel.quizScore'),
        sortingFn: (a, b) => (b.original.quizScore ?? 0) - (a.original.quizScore ?? 0),
    },
    {
        id: 'raceScore',
        header: t('coursePanel.raceScore'),
        sortingFn: (a, b) => (b.original.raceScore ?? 0) - (a.original.raceScore ?? 0),
    },
    {
        id: 'commentScore',
        header: t('coursePanel.commentScore'),
        sortingFn: (a, b) => (b.original.commentScore ?? 0) - (a.original.commentScore ?? 0),
    },
    {
        id: 'exp',
        header: t('coursePanel.exp'),
        sortingFn: (a, b) => (b.original.exp ?? 0) - (a.original.exp ?? 0),
    },
])

const defaultSort = [{ id: 'total', desc: true }]

// 先用缓存学生数据立即显示（无成绩），再异步合并成绩
function buildRows(rawData) {
    const gradeMap = new Map((rawData || []).map(r => [r.userId, r]))
    let allRows = students.value.map(s => {
        const g = gradeMap.get(s.id)
        return {
            id: s.id,
            name: s.name,
            preferName: s.preferName,
            rollNumber: s.rollNumber,
            avatarImg: s.avatarImg,
            group: g?.group || '',
            score: g?.score ?? 0,
            questionScore: g?.questionScore ?? 0,
            homeworkScore: g?.homeworkScore ?? 0,
            quizScore: g?.quizScore ?? 0,
            raceScore: g?.raceScore ?? 0,
            commentScore: g?.commentScore ?? 0,
            exp: g?.exp ?? 0,
            _hasGrade: !!g,
        }
    })
    // 学生只能看自己的那一行
    if (!canEdit.value) {
        const uid = auth.user.value?.id
        allRows = allRows.filter(r => r.id === uid)
    }
    rows.value = allRows.sort((a, b) => b.score - a.score)
}

async function loadData() {
    if (!props.courseId) return
    // 先用缓存学生数据立即显示
    buildRows([])
    pending.value = true
    try {
        // 确保班级用户已加载
        if (props.classId) {
            await fetchUsers(Number(props.classId), Number(props.courseId))
            buildRows([])
        }
        const params = new URLSearchParams({ courseId: String(props.courseId) })
        if (props.classId) params.set('classId', String(props.classId))
        const raw = await cRequest(`/api/lms/courses/grades?${params}`)
        buildRows(raw)
    } catch (e) {
        console.error('加载成绩失败', e)
    } finally {
        pending.value = false
    }
}

watch(isOpen, (val) => {
    if (val) loadData()
})
</script>
