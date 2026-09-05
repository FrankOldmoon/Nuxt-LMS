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
                                icon="i-heroicons-document" @click="openHomeworkDetail(row.original)">
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

    <!-- 作业详情弹窗（全屏逐份评阅） -->
    <UModal v-model:open="detailOpen" fullscreen>
        <template #content>
            <div v-if="detailData" class="h-full flex flex-col">
                <!-- 顶部导航：当前用户 + 序号/总数 + 前后循环切换 -->
                <div class="flex items-center gap-3 px-6 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
                    <AuthUserCard :user="detailUser" />
                    <span class="text-sm text-muted whitespace-nowrap">{{ detailIndex + 1 }}/{{ detailTotal }}</span>
                    <div class="flex items-center gap-1 ml-auto">
                        <UTooltip :text="$t('record.homeworkDetail')">
                            <UButton icon="i-lucide-chevron-left" variant="soft" size="sm" :disabled="detailTotal === 0"
                                @click="prevSubmission" />
                        </UTooltip>
                        <UTooltip :text="$t('record.homeworkDetail')">
                            <UButton icon="i-lucide-chevron-right" variant="soft" size="sm" :disabled="detailTotal === 0"
                                @click="nextSubmission" />
                        </UTooltip>
                    </div>
                </div>

                <!-- 工具栏：打分 / 评语 / 标优秀 -->
                <div class="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
                    <div class="flex items-center gap-1">
                        <label class="text-sm text-gray-500">{{ $t('record.score') }}:</label>
                        <UInput v-model.number="scoreMap[detailData.id]" type="number" size="sm" class="w-20"
                            :max="maxScore" :placeholder="String(maxScore)"
                            @blur="onScoreBlur(detailData)" @keydown.enter="$event.target.blur()" />
                        <UTooltip :text="$t('homework.quickScore')">
                            <UButton icon="i-heroicons-check" color="primary" variant="soft" size="sm"
                                @click="onQuickScore(detailData, maxScore)" />
                        </UTooltip>
                    </div>

                    <div class="flex items-center gap-1 flex-1 min-w-[220px]">
                        <label class="text-sm text-gray-500">{{ $t('homework.comment') }}:</label>
                        <UInput v-model="commentMap[detailData.id]" size="sm"
                            :placeholder="$t('homework.commentPlaceholder')"
                            @blur="onCommentBlur(detailData)" @keydown.enter="$event.target.blur()" />
                    </div>

                    <UButton size="sm" variant="soft"
                        :color="excellentMap[detailData.id] ? 'warning' : 'gray'"
                        :icon="excellentMap[detailData.id] ? 'i-heroicons-star-solid' : 'i-heroicons-star'"
                        @click="toggleExcellent(detailData)">
                        {{ excellentMap[detailData.id] ? $t('homework.excellent') : $t('homework.markExcellent') }}
                    </UButton>
                </div>

                <!-- 主内容区 -->
                <div class="flex flex-1 overflow-hidden">
                    <!-- 左列：作答内容 + 文件列表 -->
                    <div class="w-[360px] border-r border-gray-200 dark:border-gray-800 p-5 overflow-y-auto space-y-5 shrink-0">
                        <!-- 作答内容 -->
                        <div v-if="detailRecord.content">
                            <label class="text-xs text-gray-500 mb-1 block">{{ $t('homework.contentLabel') }}</label>
                            <div class="prose prose-sm dark:prose-invert max-w-none border rounded-md p-3">
                                <ueditorRender v-if="isRichDoc(detailRecord.content)" :json="detailRecord.content" :course-id="props.courseId" />
                                <p v-else class="text-sm whitespace-pre-wrap break-words">{{ detailRecord.content }}</p>
                            </div>
                        </div>

                        <!-- 得分 / 优秀标记（已有值展示） -->
                        <div class="space-y-1 text-sm">
                            <div v-if="detailRecord.score !== null && detailRecord.score !== undefined">
                                <span class="text-gray-500">{{ $t('record.score') }}: </span>
                                <span class="font-semibold text-green-600">{{ detailRecord.score }}</span>
                            </div>
                            <div v-if="detailRecord.excellent" class="text-amber-500 flex items-center gap-1">
                                <UIcon name="i-heroicons-star" class="w-4 h-4" />
                                {{ $t('homework.excellent') }}
                            </div>
                        </div>

                        <!-- 文件列表（点击切换预览） -->
                        <div v-if="fileItems.length">
                            <label class="text-xs text-gray-500 mb-1 block">{{ $t('homework.uploadLabel') }}</label>
                            <div class="flex flex-wrap gap-1">
                                <UButton v-for="(file, i) in fileItems" :key="i" size="xs" variant="soft"
                                    :color="selectedFileIndex === i ? 'primary' : 'gray'"
                                    :icon="i === activeFileIndex ? 'i-heroicons-eye' : 'i-heroicons-document'"
                                    @click="selectedFileIndex = i">
                                    {{ file.name }}
                                </UButton>
                            </div>
                        </div>
                    </div>

                    <!-- 右列：文件预览 iframe -->
                    <div class="flex-1 p-5 overflow-auto">
                        <div v-if="activeFile" class="flex flex-col gap-2 h-full">
                            <!-- 可内联预览：iframe -->
                            <iframe v-if="activeFilePreviewable && activeFile.url" :key="activeFile.url"
                                :src="activeFile.url" class="w-full flex-1 min-h-[60vh] border border-gray-200 dark:border-gray-800 rounded-md bg-white" />
                            <!-- 不可预览：仅下载 -->
                            <div v-else class="h-full min-h-[60vh] flex flex-col items-center justify-center gap-3 border border-gray-200 dark:border-gray-800 rounded-md text-muted">
                                <UIcon name="i-heroicons-arrow-down-tray" class="w-10 h-10" />
                                <span class="text-sm">{{ $t('common.download') }}</span>
                                <UButton :to="activeFile.url" target="_blank" icon="i-heroicons-arrow-down-tray"
                                    :label="$t('common.download')" color="primary" size="sm" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </UModal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
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
    detailOpen, detailData, detailRecord, detailIndex, detailTotal,
    openHomeworkDetail, prevSubmission, nextSubmission, isRichDoc, isPreviewableFile,
} = useHomeworkRecords(props, emit)

// ==================== 文件预览 ====================
// useFileNames 由 base 模块 addImportsDir 全局自动导入，返回 { url, name }（name 含原始文件名）
const selectedFileIndex = ref(0)
const fileItems = useFileNames(() => detailRecord.value?.files ?? [])
const activeFile = computed(() => fileItems.value[selectedFileIndex.value] ?? null)
const activeFileIndex = computed(() => selectedFileIndex.value)
const activeFilePreviewable = computed(() => !!activeFile.value && isPreviewableFile(activeFile.value.url))

// 切换作业时重置为预览第一个文件
watch(() => detailIndex.value, () => { selectedFileIndex.value = 0 })

// 当前评阅用户的卡片数据
const detailUser = computed(() => {
    const d = detailData.value
    if (!d) return null
    return {
        id: d.id,
        name: d.name || d.preferName || 'U',
        preferName: d.preferName || null,
        username: d.username || null,
        rollNumber: d.rollNumber || null,
        avatarImg: d.avatarImg || null,
    }
})
</script>
