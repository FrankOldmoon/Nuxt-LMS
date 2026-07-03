<template>
    <UModal v-model:open="isOpen" :ui="{ content: 'max-w-2xl' }" scrollable>
        <template #content>
            <div class="p-6">
                <h3 class="text-lg font-semibold mb-4">{{ t('coursePanel.leaderboard') }}</h3>
                <div v-if="loading" class="py-8 text-center text-gray-400">{{ t('common.loading') }}</div>
                <template v-else>
                    <!-- 我的排名 -->
                    <div v-if="data?.myInfo" class="mb-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold text-sm">
                            {{ data.myRank }}
                        </div>
                        <UAvatar :src="myStudent?.avatarImg" :alt="myStudent?.name" size="xs" :text="myStudent?.name?.charAt(0)" />
                        <span class="flex-1 font-medium">{{ myStudent?.name || `User ${data.myInfo.userId}` }} ({{ t('coursePanel.you') }})</span>
                        <span class="font-mono font-bold text-primary-600">{{ data.myInfo.score.toFixed(1) }}</span>
                    </div>

                    <!-- Top 10 -->
                    <div class="space-y-1">
                        <div
                            v-for="(item, idx) in data?.top10 || []"
                            :key="item.userId"
                            class="flex items-center gap-3 py-2 px-3 rounded-lg"
                            :class="idx < 3 ? 'bg-gray-50 dark:bg-gray-800' : ''"
                        >
                            <div
                                class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                                :class="idx === 0 ? 'bg-yellow-400 text-white' : idx === 1 ? 'bg-gray-300 text-white' : idx === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'"
                            >
                                {{ idx + 1 }}
                            </div>
                            <UAvatar :src="stuMap.get(item.userId)?.avatarImg" :alt="stuMap.get(item.userId)?.name" size="xs" :text="stuMap.get(item.userId)?.name?.charAt(0)" />
                            <span class="flex-1">{{ stuMap.get(item.userId)?.name || `User ${item.userId}` }}</span>
                            <span class="font-mono">{{ item.score.toFixed(1) }}</span>
                        </div>
                    </div>
                </template>
            </div>
        </template>
    </UModal>
</template>

<script setup>
const isOpen = defineModel('open', { default: false })
const { t } = useI18n()
const { students, fetchUsers } = useClassUsers()

const props = defineProps({
    courseId: { type: [String, Number], default: '' },
    classId: { type: [String, Number], default: '' },
})

const loading = ref(false)
const data = ref(null)

// 学生信息 map：userId -> LmsClassUser
const stuMap = computed(() => new Map(students.value.map(s => [s.id, s])))
const myStudent = computed(() => data.value?.myInfo ? stuMap.value.get(data.value.myInfo.userId) : null)

async function loadData() {
    if (!props.courseId) return
    loading.value = true
    try {
        // 确保班级用户已加载
        if (props.classId) {
            await fetchUsers(Number(props.classId), Number(props.courseId))
        }
        const params = new URLSearchParams({ courseId: String(props.courseId) })
        if (props.classId) params.set('classId', String(props.classId))
        data.value = await cRequest(`/api/lms/courses/leaderboard?${params}`)
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
