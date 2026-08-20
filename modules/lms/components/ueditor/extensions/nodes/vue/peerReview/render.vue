<template>
    <div class="peer-review-render w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
        <!-- 未创建活动 -->
        <div v-if="!peerCid" class="text-center py-8 text-sm text-gray-400">
            {{ t('peerReview.notCreated') }}
        </div>

        <!-- 加载中 -->
        <div v-else-if="loading" class="flex items-center justify-center py-6 text-sm text-gray-400">
            {{ t('common.loading') }}
        </div>

        <!-- 活动不存在 -->
        <div v-else-if="!config" class="text-center py-6 text-sm text-gray-400">
            {{ t('peerReview.notFound') }}
        </div>

        <template v-else>
            <!-- 活动标题 -->
            <div class="flex items-center gap-3 mb-4">
                <span class="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded text-xs font-medium">
                    {{ t('peerReview.label') }}
                </span>
                <span class="font-semibold text-gray-800 dark:text-gray-200">{{ config.name }}</span>
                <span class="text-xs text-gray-400">#{{ peerCid }}</span>
                <div class="ml-auto flex items-center gap-2">
                    <UButton v-if="isTeacher" icon="i-lucide-chart-bar" variant="soft" size="2xs"
                        :label="t('peerReview.result')" @click="openResult" />
                </div>
            </div>

            <!-- 学生列表 -->
            <div class="space-y-2">
                <div
                    v-for="s in students"
                    :key="s.userId"
                    class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer transition-colors"
                    :class="isTeacher ? '' : (s.userId === (selectedTarget?.userId || 0) ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800')"
                    @click="isTeacher ? null : openRating(s)"
                >
                    <UAvatar :src="s.avatarImg" :alt="s.name" size="sm" />
                    <span class="flex-1 min-w-0 text-sm truncate">{{ s.name }}</span>
                    <!-- 教师：显示均分 -->
                    <span v-if="isTeacher" class="text-xs text-gray-500">
                        {{ t('peerReview.received', { n: 0 }) }}
                    </span>
                    <!-- 学生：已评/未评徽标 -->
                    <UBadge v-else :color="isRated(s.userId) ? 'success' : 'neutral'" variant="subtle" size="sm">
                        {{ isRated(s.userId) ? t('peerReview.rated') : t('peerReview.unrated') }}
                    </UBadge>
                </div>
            </div>

            <!-- 学生评价面板 -->
            <div v-if="selectedTarget && !isTeacher" class="mt-4 p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50/50 dark:bg-blue-900/10">
                <div class="flex items-center justify-between mb-3">
                    <span class="text-sm font-medium">{{ t('peerReview.rateLabel', { name: selectedTarget.name }) }}</span>
                    <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="2xs" @click="closeRating" />
                </div>
                <div class="space-y-3">
                    <div v-for="opt in config.options" :key="opt.key" class="flex items-center gap-3">
                        <span class="w-28 text-sm truncate">{{ opt.label }}</span>
                        <input
                            type="range" min="0" :max="opt.maxScore" step="1"
                            class="flex-1"
                            :value="draftScores[opt.key] ?? 0"
                            @input="draftScores[opt.key] = Number($event.target.value)"
                        />
                        <span class="w-16 text-right text-sm tabular-nums">{{ draftScores[opt.key] ?? 0 }} / {{ opt.maxScore }}</span>
                    </div>
                </div>
                <div class="flex items-center justify-end gap-2 mt-4">
                    <span v-if="submitMsg" class="text-xs" :class="submitOk ? 'text-green-500' : 'text-red-500'">{{ submitMsg }}</span>
                    <UButton color="primary" size="sm" :loading="submitting" @click="submitRating">
                        {{ isRated(selectedTarget.userId) ? t('peerReview.update') : t('peerReview.submit') }}
                    </UButton>
                </div>
            </div>
        </template>

        <!-- 教师结果弹窗 -->
        <UModal v-model:open="resultOpen" scrollable>
            <template #content>
                <div class="p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold">{{ t('peerReview.result') }}</h3>
                        <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="closeResult" />
                    </div>
                    <div v-if="resultLoading" class="py-8 text-center text-sm text-gray-400">{{ t('common.loading') }}</div>
                    <template v-else-if="resultData">
                        <div class="space-y-2 max-h-[50vh] overflow-auto pr-1">
                            <div v-for="s in resultData.students" :key="s.userId"
                                class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                                <UAvatar :src="s.avatarImg" :alt="s.name" size="sm" />
                                <span class="flex-1 min-w-0 text-sm truncate">{{ s.name }}</span>
                                <span class="text-xs text-gray-500">{{ t('peerReview.received', { n: s.receivedCount }) }}</span>
                                <span class="text-sm font-semibold tabular-nums">{{ s.peerScore }}</span>
                            </div>
                        </div>
                        <!-- 评价明细 -->
                        <div v-if="resultData.details && resultData.details.length" class="mt-4">
                            <div class="text-sm font-medium mb-2">{{ t('peerReview.details') }}</div>
                            <div class="space-y-1 text-xs text-gray-500 max-h-40 overflow-auto">
                                <div v-for="(d, i) in resultData.details" :key="i" class="flex gap-2">
                                    <span class="w-20 truncate">{{ d.fromName }} → {{ d.targetName }}</span>
                                    <span>{{ Object.values(d.scores || {}).join(', ') }}</span>
                                </div>
                            </div>
                        </div>
                        <div class="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <span v-if="settling" class="text-xs text-green-500 self-center">{{ t('peerReview.settleDone') }}</span>
                            <UButton icon="i-lucide-badge-check" color="primary" :loading="settling" @click="settleScores">
                                {{ t('peerReview.settle') }}
                            </UButton>
                        </div>
                    </template>
                </div>
            </template>
        </UModal>
    </div>
</template>

<script setup>
import { usePeerReviewRender } from './usePeerReviewRender'

const props = defineProps({
    node: Object,
    courseId: { type: [Number, String], default: undefined },
})
const emit = defineEmits(['saved'])

const {
    t, loading, config, students, myScores, isTeacher, peerCid,
    selectedTarget, draftScores, submitting, submitMsg, submitOk,
    resultOpen, resultData, resultLoading, settling,
    openRating, closeRating, isRated, submitRating,
    openResult, closeResult, settleScores,
} = usePeerReviewRender(props, emit)
</script>

<style scoped>
.peer-review-render { width: 100%; }
</style>
