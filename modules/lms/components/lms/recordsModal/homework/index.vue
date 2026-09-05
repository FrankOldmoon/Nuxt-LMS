<template>
    <UModal v-model:open="open" scrollable fullscreen>
        <template #body>
            <div class="p-6 space-y-4 min-w-[600px]">
                <div class="flex items-center justify-between">
                    <h2 class="text-lg font-semibold">{{ $t('record.homeworkRecords') }}</h2>
                    <UTooltip :text="$t('common.refresh')">
                        <UButton icon="i-lucide-refresh-cw" variant="soft" size="sm" :loading="pending" @click="fetchRecords" />
                    </UTooltip>
                </div>

                <ClassUsersTable :rows="rows" :loading="pending" :extra-columns="extraColumns"
                    :hide-actions="true" :hide-teachers="true" :default-sort="defaultSort">
                    <!-- record 列：查看详情按钮 -->
                    <template #record-cell="{ row }">
                        <div class="flex items-center gap-2">
                            <UButton v-if="row.original.record" size="xs" variant="soft"
                                icon="i-heroicons-document" @click="openHomeworkDetail(row.original.record)">
                                {{ $t('record.viewDetail') }}
                            </UButton>
                            <span v-else class="text-xs text-gray-400">-</span>
                        </div>
                    </template>

                    <!-- score 列：打分输入 + 一键满分 -->
                    <template #score-cell="{ row }">
                        <div v-if="row.original.record" class="flex items-center gap-1">
                            <UInput v-model.number="scoreMap[row.original.id]" type="number"
                                size="xs" class="w-16" :max="maxScore" :placeholder="maxScore"
                                @blur="onScoreBlur(row.original)" @keydown.enter="$event.target.blur()" />
                            <UTooltip :text="$t('homework.quickScore')">
                                <UButton icon="i-heroicons-check" color="primary" variant="soft" size="xs"
                                    @click="onQuickScore(row.original, maxScore)" />
                            </UTooltip>
                        </div>
                        <span v-else class="text-xs text-gray-400">-</span>
                    </template>

                    <!-- comment 列：评语输入 -->
                    <template #comment-cell="{ row }">
                        <UInput v-if="row.original.record" v-model="commentMap[row.original.id]"
                            size="xs" class="w-44" :placeholder="$t('homework.commentPlaceholder')"
                            @blur="onCommentBlur(row.original)" @keydown.enter="$event.target.blur()" />
                        <span v-else class="text-xs text-gray-400">-</span>
                    </template>

                    <!-- excellent 列：标为优秀 -->
                    <template #excellent-cell="{ row }">
                        <UButton v-if="row.original.record" size="xs" variant="soft"
                            :color="excellentMap[row.original.id] ? 'warning' : 'gray'"
                            :icon="excellentMap[row.original.id] ? 'i-heroicons-star' : 'i-heroicons-star'"
                            @click="toggleExcellent(row.original)">
                            {{ excellentMap[row.original.id] ? $t('homework.excellent') : $t('homework.markExcellent') }}
                        </UButton>
                        <span v-else class="text-xs text-gray-400">-</span>
                    </template>
                </ClassUsersTable>
            </div>
        </template>
    </UModal>

    <!-- 作业详情弹窗 -->
    <UModal v-model:open="detailOpen" scrollable>
        <template #content>
            <div v-if="detailData" class="p-6 space-y-4 min-w-[500px]">
                <h2 class="text-lg font-semibold">{{ $t('record.homeworkDetail') }}</h2>

                <!-- 作答内容 -->
                <div v-if="detailData.content">
                    <label class="text-xs text-gray-500 mb-1 block">{{ $t('homework.contentLabel') }}</label>
                    <div class="prose prose-sm dark:prose-invert max-w-none border rounded-md p-3">
                        <ueditorRender v-if="isRichDoc(detailData.content)" :json="detailData.content" />
                        <p v-else class="text-sm whitespace-pre-wrap break-words">{{ detailData.content }}</p>
                    </div>
                </div>

                <!-- 提交文件 -->
                <div v-if="detailData.files && detailData.files.length">
                    <label class="text-xs text-gray-500 mb-1 block">{{ $t('homework.uploadLabel') }}</label>
                    <HomeworkFileList :files="detailData.files" />
                </div>

                <!-- 得分 -->
                <div v-if="detailData.score !== null && detailData.score !== undefined">
                    <label class="text-xs text-gray-500">{{ $t('record.score') }}: </label>
                    <span class="text-sm font-medium">{{ detailData.score }}</span>
                </div>

                <!-- 优秀标记 -->
                <div v-if="detailData.excellent">
                    <span class="text-xs text-amber-500 flex items-center gap-1">
                        <UIcon name="i-heroicons-star" class="w-4 h-4" />
                        {{ $t('homework.excellent') }}
                    </span>
                </div>

                <!-- 评语 -->
                <div v-if="strFromComment(detailData.comment)">
                    <label class="text-xs text-gray-500 block mb-1">{{ $t('homework.comment') }}</label>
                    <p class="text-sm whitespace-pre-wrap break-words">{{ strFromComment(detailData.comment) }}</p>
                </div>
            </div>
        </template>
    </UModal>
</template>

<script setup>
import { useHomeworkRecords } from './useHomeworkRecords'

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    courseId: { type: Number, default: 0 },
    cid: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
})

const emit = defineEmits(['update:modelValue'])

const {
    open, rows, pending, extraColumns, defaultSort, scoreMap, commentMap, excellentMap, fetchRecords,
    onScoreBlur, onQuickScore, onCommentBlur, toggleExcellent,
    detailOpen, detailData, openHomeworkDetail, isRichDoc, strFromComment,
} = useHomeworkRecords(props, emit)
</script>
