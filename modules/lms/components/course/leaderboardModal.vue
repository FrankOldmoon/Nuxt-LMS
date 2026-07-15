<template>
    <UModal v-model:open="isOpen" :ui="{ content: 'max-w-3xl' }" scrollable>
        <template #content>
            <div class="p-6 space-y-4">
                <h3 class="text-lg font-semibold">{{ $t('coursePanel.leaderboard') }}</h3>

                <!-- MineRanking -->
                <div v-if="myRank" class="p-3 bg-primary/10 rounded-lg flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                        {{ myRank.rank }}
                    </div>
                    <UAvatar :src="myStudent?.avatarImg" :alt="myStudent?.name" size="xs"
                        :text="myStudent?.name?.charAt(0)" />
                    <span class="flex-1 font-medium">
                        {{ myStudent?.name || `User ${myRank.userId}` }}
                        <span class="text-xs text-muted">({{ $t('coursePanel.you') }})</span>
                    </span>
                    <span class="font-mono font-bold text-primary">{{ myRank.score.toFixed(1) }}</span>
                </div>

                <div v-if="loading" class="py-8 text-center text-muted">
                    <UIcon name="i-lucide-loader-2" class="animate-spin size-4 mr-2 inline-block" />
                    {{ $t('common.loading') }}
                </div>

                <!-- Leaderboard table (student/group tab + chart) -->
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

<script setup lang="ts">
const isOpen = defineModel<boolean>('open', { default: false })

const props = defineProps<{
    courseId: string | number
    classId: string | number
}>()

const { loading, myStudent, myRank, tableRows, extraColumns } = useCourseLeaderboard(props, isOpen)
</script>
