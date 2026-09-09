<template>
    <UModal v-model:open="isOpen" :ui="{ content: 'max-w-2xl' }" scrollable>
        <template #content>
            <div class="p-6 space-y-4">
                <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold">{{ $t('coursePanel.classAvg') }}</h3>
                    <UButton icon="i-lucide-bar-chart-3" color="primary" variant="soft" size="xs"
                        :label="$t('coursePanel.backToLeaderboard')" @click="isOpen = false" />
                </div>

                <div v-if="loading" class="py-8 text-center text-muted">
                    <UIcon name="i-lucide-loader-2" class="animate-spin size-4 mr-2 inline-block" />
                    {{ $t('common.loading') }}
                </div>

                <div v-else-if="rows.length === 0" class="py-8 text-center text-muted">
                    {{ $t('coursePanel.classAvgEmpty') }}
                </div>

                <!-- 各班生均得分排行表格 -->
                <table v-else class="w-full text-sm">
                    <thead>
                        <tr class="text-left text-xs text-muted uppercase tracking-wide border-b">
                            <th class="py-2 pr-2">{{ $t('coursePanel.rank') }}</th>
                            <th class="py-2 pr-2">{{ $t('coursePanel.name') }}</th>
                            <th class="py-2 pr-2 text-right">{{ $t('coursePanel.students') }}</th>
                            <th class="py-2 pr-2 text-right">{{ $t('coursePanel.total') }}</th>
                            <th class="py-2 text-right">{{ $t('coursePanel.avgScore') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="r in rows" :key="r.classId" class="border-b last:border-0">
                            <td class="py-2.5 pr-2">
                                <span
                                    :class="r.rank <= 3 ? 'inline-flex items-center justify-center size-6 rounded-full text-white text-xs font-bold ' + medalBg(r.rank) : 'text-muted'">
                                    {{ r.rank }}
                                </span>
                            </td>
                            <td class="py-2.5 pr-2 font-medium">{{ r.name }}</td>
                            <td class="py-2.5 pr-2 text-right text-muted">{{ r.studentCount }}</td>
                            <td class="py-2.5 pr-2 text-right font-mono">{{ Number(r.scoreSum).toFixed(1) }}</td>
                            <td class="py-2.5 text-right font-mono font-bold text-primary">{{ Number(r.avg).toFixed(1) }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </template>
    </UModal>
</template>

<script setup lang="ts">
const isOpen = defineModel<boolean>('open', { default: false })

const props = defineProps<{
    courseId: string | number
}>()

const { loading, rows } = useCourseClassLeaderboard(props, isOpen)

const MEDAL = ['bg-yellow-400', 'bg-slate-400', 'bg-amber-700']
const medalBg = (rank: number) => MEDAL[rank - 1] || ''
</script>