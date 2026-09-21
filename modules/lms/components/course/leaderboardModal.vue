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
                    </div>
                </div>

                <!-- 左：班级排行（本班学生） / 右：全局排行（本课程前10，排除教师） -->
                <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
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

                    <!-- 全局排行（本课程前10，跨班级） -->
                    <div class="min-w-0 rounded-lg border border-default bg-elevated/50 p-3">
                        <div class="flex items-center gap-2 mb-3">
                            <UIcon name="i-lucide-globe" class="size-4 text-primary" />
                            <h4 class="text-sm font-semibold">{{ $t('coursePanel.globalRank') }}</h4>
                        </div>

                        <div v-if="globalLoading" class="py-6 text-center text-muted text-xs">
                            <UIcon name="i-lucide-loader-2" class="animate-spin size-4 mr-1 inline-block" />
                            {{ $t('common.loading') }}
                        </div>
                        <div v-else-if="!globalRows.length" class="py-6 text-center text-muted text-xs">
                            {{ $t('coursePanel.globalRankEmpty') }}
                        </div>

                        <table v-else class="w-full text-xs">
                            <thead>
                                <tr class="text-left text-[11px] text-muted uppercase tracking-wide border-b border-default">
                                    <th class="py-1.5 pr-1 w-8 font-medium">{{ $t('coursePanel.rank') }}</th>
                                    <th class="py-1.5 pr-1 font-medium">{{ $t('coursePanel.name') }}</th>
                                    <th class="py-1.5 pr-1 font-medium">{{ $t('coursePanel.className') }}</th>
                                    <th class="py-1.5 text-right font-medium">{{ $t('coursePanel.score') }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="r in globalRows" :key="r.userId"
                                    class="border-b border-default/60 last:border-0">
                                    <td class="py-2 pr-1 align-middle">
                                        <span
                                            :class="r.rank <= 3 ? 'inline-flex items-center justify-center size-5 rounded-full text-white text-[10px] font-bold ' + medalBg(r.rank) : 'text-muted'">
                                            {{ r.rank }}
                                        </span>
                                    </td>
                                    <td class="py-2 pr-1 align-middle">
                                        <div class="flex items-center gap-1.5 min-w-0">
                                            <AvatarWithFrame :src="r.avatarImg || undefined" :alt="r.name" size="xs"
                                                :text="r.name?.charAt(0)" :userId="r.userId" />
                                            <span class="truncate font-medium">{{ r.name }}</span>
                                        </div>
                                    </td>
                                    <td class="py-2 pr-1 align-middle text-muted">
                                        <span class="block truncate max-w-[92px]">{{ r.className || '-' }}</span>
                                    </td>
                                    <td class="py-2 text-right align-middle font-mono font-bold text-primary">
                                        {{ (Number(r.score) || 0).toFixed(1) }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </template>
    </UModal>

    <!-- 各班生均得分排行 -->
    <CourseClassAvgLeaderboardModal v-model:open="classAvgOpen" :course-id="props.courseId" />
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
// 全局排行（本课程前10，排除教师）
const { loading: globalLoading, rows: globalRows } = useCourseGlobalLeaderboard(props, isOpen)

const classAvgOpen = ref(false)

const MEDAL = ['bg-yellow-400', 'bg-slate-400', 'bg-amber-700']
const medalBg = (rank: number) => MEDAL[rank - 1] || ''
</script>
