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
                <div v-if="!canEdit" class="mt-6 space-y-4">
                    <h4 class="text-sm font-semibold text-muted">{{ t('coursePanel.learningStats') }}</h4>
                    <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div v-for="s in statCards" :key="s.label"
                            class="border border-default rounded-lg p-3 text-center">
                            <div class="text-2xl font-bold text-primary">{{ s.value }}</div>
                            <div class="text-xs text-muted mt-1">{{ s.label }}</div>
                        </div>
                    </div>

                    <h4 class="text-sm font-semibold text-muted pt-2">{{ t('coursePanel.ability') }}</h4>
                    <ClientOnly>
                        <Chart :option="radarOption" height="320" />
                    </ClientOnly>
                </div>
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
        id: 'marksScore',
        header: t('coursePanel.marksScore'),
        sortingFn: (a, b) => (b.original.marksScore ?? 0) - (a.original.marksScore ?? 0),
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
            marksScore: g?.marksScore ?? 0,
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

// 学生端：学习数据统计
const stats = ref({ questionCount: 0, homeworkCount: 0, quizCount: 0, raceCount: 0, commentCount: 0 })
async function loadStats() {
    try {
        const data = await cRequest(`/api/courses/stats?courseId=${props.courseId}`)
        if (data) stats.value = data
    } catch (e) {
        /* 静默 */
    }
}
const statCards = computed(() => [
    { label: t('coursePanel.question'), value: stats.value.questionCount },
    { label: t('coursePanel.homework'), value: stats.value.homeworkCount },
    { label: t('coursePanel.quizScore'), value: stats.value.quizCount },
    { label: t('coursePanel.raceScore'), value: stats.value.raceCount },
    { label: t('coursePanel.comment'), value: stats.value.commentCount },
])

// 学生端：能力雷达图（用各项 score 作为能力维度）
const radarOption = computed(() => {
    const r = rows.value[0]
    if (!r) return {}
    const dims = [
        { name: t('coursePanel.questionScore'), value: Number(r.questionScore) || 0 },
        { name: t('coursePanel.homeworkScore'), value: Number(r.homeworkScore) || 0 },
        { name: t('coursePanel.quizScore'), value: Number(r.quizScore) || 0 },
        { name: t('coursePanel.commentScore'), value: Number(r.commentScore) || 0 },
        { name: t('coursePanel.raceScore'), value: Number(r.raceScore) || 0 },
        { name: t('coursePanel.marksScore'), value: Number(r.marksScore) || 0 },
    ]
    const peak = Math.max(...dims.map(d => d.value), 10)
    const maxVal = Math.ceil(peak * 1.2 / 10) * 10
    return {
        tooltip: {},
        radar: {
            indicator: dims.map(d => ({ name: d.name, max: maxVal })),
            radius: '60%',
            splitNumber: 4,
        },
        series: [{
            type: 'radar',
            data: [{
                value: dims.map(d => d.value),
                name: t('coursePanel.ability'),
                areaStyle: { opacity: 0.2 },
                lineStyle: { width: 2 },
            }],
        }],
    }
})

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
        const raw = await cRequest(`/api/courses/grades?${params}`)
        buildRows(raw)
        // 学生端额外加载学习数据
        if (!canEdit.value) {
            await loadStats()
        }
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
