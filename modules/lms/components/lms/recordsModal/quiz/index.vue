<template>
    <UModal v-model:open="open" scrollable fullscreen>
        <template #body>
            <div class="p-6 space-y-4 min-w-[600px]">
                <div class="flex items-center justify-between">
                    <h2 class="text-lg font-semibold">{{ $t('record.quizRecords') }}</h2>
                    <div class="flex items-center gap-2">
                        <LmsClassSelector :course-id="courseId" />
                        <UTooltip :text="$t('common.refresh')">
                            <UButton icon="i-lucide-refresh-cw" variant="soft" size="sm" :loading="pending" @click="fetchRecords" />
                        </UTooltip>
                    </div>
                </div>

                <!-- 提交统计概览 -->
                <div v-if="rows.length" class="flex flex-wrap gap-x-6 gap-y-2 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 text-sm">
                    <span class="text-muted">{{ $t('quiz.submittedCount', { n: summary.submitted, total: summary.total }) }}</span>
                    <span class="text-muted">{{ $t('quiz.avgScore', { n: summary.avgScore }) }}</span>
                    <span class="text-muted">{{ $t('quiz.passRate', { n: summary.passRate }) }}</span>
                    <span class="text-muted">{{ $t('quiz.topScore', { n: summary.topScore }) }}</span>
                </div>

                <ClassUsersTable :rows="rows" :loading="pending" :extra-columns="extraColumns"
                    :hide-actions="true" :hide-teachers="true" :default-sort="defaultSort">
                    <!-- 得分列 -->
                    <template #score-cell="{ row }">
                        <div class="flex items-center gap-2">
                            <template v-if="row.original.record">
                                <span class="text-sm font-medium"
                                    :class="scoreClass(row.original.record)">
                                    {{ row.original.record.score }} / {{ quizPoint }}
                                </span>
                            </template>
                            <span v-else class="text-xs text-gray-400">-</span>
                        </div>
                    </template>
                    <!-- 提交次数列 -->
                    <template #submitCount-cell="{ row }">
                        <span v-if="row.original.record" class="text-xs">
                            {{ row.original.record.submitCount || 0 }}
                        </span>
                        <span v-else class="text-xs text-gray-400">-</span>
                    </template>
                    <!-- 正确率列 -->
                    <template #correctRate-cell="{ row }">
                        <div v-if="row.original.record" class="flex items-center gap-1">
                            <UIcon :name="rateIcon(row.original.record)" class="w-3.5 h-3.5 shrink-0"
                                :class="rateIconClass(row.original.record)" />
                            <span class="text-xs">{{ formatRate(row.original.record) }}</span>
                        </div>
                        <span v-else class="text-xs text-gray-400">-</span>
                    </template>
                    <!-- 每道题的答题状态列（动态 slot） -->
                    <template v-for="q in questions" :key="q.id" #[`q${q.id}-cell`]="{ row }">
                        <div v-if="getQuestionRecord(row.original, q.id)" class="flex items-center justify-center">
                            <UIcon :name="getQuestionRecord(row.original, q.id).rate > 0
                                ? 'i-lucide-check-circle-2' : 'i-lucide-x-circle'"
                                class="size-4"
                                :class="getQuestionRecord(row.original, q.id).rate > 0
                                    ? 'text-success' : 'text-error'" />
                        </div>
                        <span v-else class="text-xs text-gray-400">-</span>
                    </template>
                    <!-- 答卷操作列 -->
                    <template #detail-cell="{ row }">
                        <UButton v-if="row.original.record" size="xs" variant="soft"
                            icon="i-heroicons-document" @click="openDetail(row.original)">
                            {{ $t('record.viewDetail') }}
                        </UButton>
                        <span v-else class="text-xs text-gray-400">-</span>
                    </template>
                </ClassUsersTable>
            </div>
        </template>
    </UModal>

    <!-- 答卷详情弹窗（全屏逐题讲评） -->
    <UModal v-model:open="detailOpen" fullscreen>
        <template #content>
            <div v-if="detailRow" class="h-full flex flex-col">
                <!-- 顶栏：学生卡片 + 总分 + 关闭 -->
                <div class="flex items-center gap-4 px-6 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
                    <AuthUserCard :user="detailUser" />
                    <div class="flex items-center gap-2 ml-auto">
                        <span class="text-sm font-medium"
                            :class="scoreClass(detailRow.record)">
                            {{ detailRow.record.score }} / {{ quizPoint }}{{ $t('question.points') }}
                        </span>
                        <UTooltip :text="$t('common.close')">
                            <UButton icon="i-heroicons-x-mark" color="warning" variant="soft" size="sm" @click="closeDetail()" />
                        </UTooltip>
                    </div>
                </div>

                <!-- 逐题讲评：复用题目渲染组件（教师视角含答案/解析），预填学生作答 -->
                <div class="flex-1 overflow-y-auto p-6 space-y-4">
                    <div v-for="(q, idx) in questions" :key="q.id" class="space-y-1">
                        <div class="text-xs text-muted font-medium">
                            {{ $t('quiz.question') }} {{ idx + 1 }}
                            <span class="ml-2">({{ q.point }}{{ $t('question.points') }})</span>
                        </div>
                        <QuestionRender :node="{ attrs: { type: 'question', content: String(q.id) } }"
                            :course-id="courseId" :in-quiz="true" :initial-record="getInitialRecord(q.id)" />
                    </div>
                </div>
            </div>
        </template>
    </UModal>
</template>

<script setup>
import { computed } from 'vue'
import { useQuizRecords } from './useQuizRecords'
import QuestionRender from '../../../ueditor/extensions/nodes/vue/question/render.vue'

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    courseId: { type: Number, default: 0 },
    cid: { type: Number, default: 0 },
    quizPoint: { type: Number, default: 100 },
    /** quiz 题目列表：[{ id, point }] */
    questions: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])

const {
    open, rows, pending, extraColumns, defaultSort, fetchRecords,
    getQuestionRecord, scoreClass, formatRate, rateIcon, rateIconClass,
    summary, detailOpen, detailRow, openDetail, closeDetail, getInitialRecord,
} = useQuizRecords(props, emit)

// 当前评阅学生的卡片数据
const detailUser = computed(() => {
    const d = detailRow.value
    if (!d) return null
    return {
        id: d.id,
        name: d.name || d.preferName || 'U',
        preferName: d.preferName || null,
        username: d.username || null,
        rollNumber: d.rollNumber || null,
        avatarImg: d.avatarImg || null,
        avatarFrame: d.avatarFrame || null,
    }
})
</script>
