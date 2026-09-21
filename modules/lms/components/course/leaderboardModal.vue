<template>
    <UModal v-model:open="isOpen" :ui="{ content: 'max-w-6xl' }" scrollable>
        <template #content>
            <div class="p-6 space-y-4">
                <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold">{{ $t('coursePanel.leaderboard') }}</h3>
                    <div class="flex items-center gap-2">
                        <LmsClassSelector v-if="canEdit" :course-id="courseId" />
                        <UTooltip :text="$t('coursePanel.classAvg')">
                            <UButton icon="i-lucide-bar-chart-3" color="primary" variant="soft" size="xs"
                                :label="$t('coursePanel.classAvg')" @click="classAvgOpen = true" />
                        </UTooltip>
                        <UTooltip :text="$t('coursePanel.globalRank')">
                            <UButton icon="i-lucide-globe" color="primary" variant="soft" size="xs"
                                :label="$t('coursePanel.globalRank')" @click="globalOpen = true" />
                        </UTooltip>
                    </div>
                </div>

                <!-- 班级排行（本班学生）；全局排行与各班生均分都是按钮弹出的独立弹窗 -->
                <div class="space-y-4">
                    <!-- 班级排行 -->
                    <div class="min-w-0 space-y-4">
                        <!-- 我的排名 -->
                        <div v-if="myRank" class="p-3 bg-primary/10 rounded-lg flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                                {{ myRank.rank }}
                            </div>
                            <AvatarWithFrame :src="myStudent?.avatarImg" :alt="myStudent?.name" size="xs"
                                :text="myStudent?.name?.charAt(0)" :frame="myStudent?.avatarFrame || null" :userId="myStudent?.id" />
                            <span class="flex-1 font-medium">
                                {{ myStudent?.name || `User ${myRank.userId}` }}
                                <span class="text-xs text-muted">({{ $t('coursePanel.you') }})</span>
                            </span>
                            <span class="text-xs font-semibold text-highlighted">Lv.{{ myLv }}</span>
                            <span class="font-mono font-bold text-primary">{{ myRank.score.toFixed(1) }}</span>
                        </div>

                        <div v-if="loading" class="py-8 text-center text-muted">
                            <UIcon name="i-lucide-loader-2" class="animate-spin size-4 mr-2 inline-block" />
                            {{ $t('common.loading') }}
                        </div>

                        <!-- 排行榜表格（学生/小组 Tab + 图表），前三名显示金银铜奖杯 -->
                        <ClassUsersTable v-else :rows="tableRows" :class-id="Number(props.classId)"
                            :course-id="Number(props.courseId)" :hide-actions="true" :hide-teachers="true"
                            :hide-number="true" :default-sort="[{ id: 'score', desc: true }]"
                            show-chart show-group show-medal
                            :extra-columns="extraColumns">
                            <template #class-cell="{ row }">
                                <span class="text-xs text-muted">{{ row.original.className || '-' }}</span>
                            </template>
                            <template #lv-cell="{ row }">
                                <span class="font-semibold text-xs">Lv.{{ row.original.lv ?? 1 }}</span>
                            </template>
                            <template #score-cell="{ row }">
                                <span class="font-mono font-bold text-sm">{{ (row.original.score ?? 0).toFixed(1) }}</span>
                            </template>
                        </ClassUsersTable>
                    </div>
                </div>
            </div>
        </template>
    </UModal>

    <!-- 各班生均得分排行 -->
    <CourseClassAvgLeaderboardModal v-model:open="classAvgOpen" :course-id="props.courseId" />
    <!-- 全局排行（本课程前10，跨班级，排除教职工） -->
    <CourseGlobalLeaderboardModal v-model:open="globalOpen" :course-id="props.courseId" />
</template>

<script setup lang="ts">
const isOpen = defineModel<boolean>('open', { default: false })

const props = defineProps<{
    courseId: string | number
    classId: string | number
}>()

const { isCourseTeacher, hasRole } = useAuthLms()
const canEdit = computed(() => hasRole('admin') || isCourseTeacher(Number(props.courseId)))
const { loading, myStudent, myRank, myLv, tableRows, extraColumns } = useCourseLeaderboard(props, isOpen)

// 各班生均分 / 全局排行：都是按钮弹出的独立弹窗（不在本弹窗内联展示）
const classAvgOpen = ref(false)
const globalOpen = ref(false)
</script>
