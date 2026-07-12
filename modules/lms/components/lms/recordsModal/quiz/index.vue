<template>
    <UModal v-model:open="open" scrollable fullscreen>
        <template #body>
            <div class="p-6 space-y-4 min-w-[600px]">
                <h2 class="text-lg font-semibold">{{ $t('record.quizRecords') }}</h2>

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
                </ClassUsersTable>
            </div>
        </template>
    </UModal>
</template>

<script setup>
import { useQuizRecords } from './useQuizRecords'

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
    open, rows, pending, extraColumns, defaultSort,
    getQuestionRecord, scoreClass, formatRate, rateIcon, rateIconClass,
} = useQuizRecords(props, emit)
</script>
