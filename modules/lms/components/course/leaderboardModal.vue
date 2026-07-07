<template>
    <UModal v-model:open="isOpen" :ui="{ content: 'max-w-3xl' }" scrollable>
        <template #content>
            <div class="p-6 space-y-4">
                <h3 class="text-lg font-semibold">{{ t('coursePanel.leaderboard') }}</h3>

                <!-- 我的排名 -->
                <div v-if="myRank" class="p-3 bg-primary/10 rounded-lg flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                        {{ myRank.rank }}
                    </div>
                    <UAvatar :src="myStudent?.avatarImg" :alt="myStudent?.name" size="xs"
                        :text="myStudent?.name?.charAt(0)" />
                    <span class="flex-1 font-medium">
                        {{ myStudent?.name || `User ${myRank.userId}` }}
                        <span class="text-xs text-muted">({{ t('coursePanel.you') }})</span>
                    </span>
                    <span class="font-mono font-bold text-primary">{{ myRank.score.toFixed(1) }}</span>
                </div>

                <div v-if="loading" class="py-8 text-center text-muted">
                    <UIcon name="i-lucide-loader-2" class="animate-spin size-4 mr-2 inline-block" />
                    {{ t('common.loading') }}
                </div>

                <!-- 排行榜表格（学生/小组 Tab + 图表） -->
                <ClassUsersTable v-else :rows="tableRows" :class-id="Number(props.classId)"
                    :course-id="Number(props.courseId)" :hide-actions="true" :hide-teachers="true"
                    :hide-number="true" :default-sort="[{ id: 'score', desc: true }]"
                    show-chart show-group
                    :extra-columns="extraColumns">
                    <template #score-cell="{ row }">
                        <span class="font-mono font-bold text-sm">{{ (row.original.score ?? 0).toFixed(1) }}</span>
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
const { user } = useAuth()

const props = defineProps({
    courseId: { type: [String, Number], default: '' },
    classId: { type: [String, Number], default: '' },
})

const loading = ref(false)
const scoreRows = ref([])

// 学生信息 map：userId -> LmsClassUser
const stuMap = computed(() => new Map(students.value.map(s => [s.id, s])))
const myStudent = computed(() => user.value ? stuMap.value.get(user.value.id) : null)

// 我的排名
const myRank = computed(() => {
    if (!user.value) return null
    const sorted = [...scoreRows.value].sort((a, b) => (b.score || 0) - (a.score || 0))
    const idx = sorted.findIndex(r => r.userId === user.value.id)
    if (idx < 0) return null
    return { rank: idx + 1, userId: user.value.id, score: sorted[idx].score || 0 }
})

// ClassUsersTable 的行数据：合并 students 和 score
const tableRows = computed(() => {
    const scoreMap = new Map(scoreRows.value.map(r => [r.userId, r.score || 0]))
    return students.value.map(s => ({
        id: s.id,
        name: s.name,
        preferName: s.preferName,
        rollNumber: s.rollNumber,
        avatarImg: s.avatarImg,
        score: scoreMap.get(s.id) ?? 0,
    }))
})

// 额外列：总分
const extraColumns = computed(() => [
    { id: 'score', header: t('coursePanel.score') },
])

async function loadData() {
    if (!props.courseId) return
    loading.value = true
    try {
        if (props.classId) {
            await fetchUsers(Number(props.classId), Number(props.courseId))
        }
        const params = new URLSearchParams({ courseId: String(props.courseId) })
        if (props.classId) params.set('classId', String(props.classId))
        const data = await cRequest(`/api/courses/leaderboard?${params}`)
        // 用全量 top10 作为行数据（包含所有学生，补0）
        scoreRows.value = data?.top10 || []
    } catch (e) {
        console.error('加载排行榜失败', e)
    } finally {
        loading.value = false
    }
}

watch(isOpen, (val) => {
    if (val) loadData()
})
</script>
