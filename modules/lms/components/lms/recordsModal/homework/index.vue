<template>
    <UModal v-model:open="open" scrollable fullscreen>
        <template #body>
            <div class="p-6 space-y-4 min-w-[600px]">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3 min-w-0">
                        <h2 class="text-lg font-semibold whitespace-nowrap">{{ $t('record.homeworkRecords') }}</h2>
                        <!-- 满分提示：本 homework 的总分 -->
                        <span v-if="maxScore > 0" class="text-sm text-muted whitespace-nowrap">
                            {{ $t('record.fullScore') }}: {{ maxScore }}
                        </span>
                    </div>
                    <div class="flex items-center gap-2">
                        <UButton icon="i-heroicons-percent-badge" color="warning" variant="soft" size="sm"
                            :loading="scoringAll" :label="$t('record.scoreAllSubmitted')"
                            @click="scoreAllConfirmOpen = true" />
                        <UButton icon="i-heroicons-arrow-down-tray" variant="soft" size="sm"
                            :loading="downloadingAll" :label="$t('record.downloadAllFiles')"
                            @click="downloadAllFiles" />
                        <LmsClassSelector :course-id="courseId" />
                        <UTooltip :text="$t('common.refresh')">
                            <UButton icon="i-lucide-refresh-cw" variant="soft" size="sm" :loading="pending" @click="fetchRecords" />
                        </UTooltip>
                    </div>
                </div>

                <ClassUsersTable :rows="rows" :loading="pending" :extra-columns="extraColumns"
                    :hide-actions="true" :hide-teachers="true" :default-sort="defaultSort">
                    <!-- record 列：查看详情按钮（仅真实提交可查看） -->
                    <template #record-cell="{ row }">
                        <div class="flex items-center gap-2">
                            <UButton v-if="hasSubmission(row.original.record)" size="xs" variant="soft"
                                icon="i-heroicons-document" @click="openHomeworkDetail(row.original)">
                                {{ $t('record.viewDetail') }}
                            </UButton>
                            <span v-else class="text-xs text-gray-400">-</span>
                        </div>
                    </template>

                    <!-- submittedAt 列：提交时间（仅真实提交显示） -->
                    <template #submittedAt-cell="{ row }">
                        <span v-if="submittedAtOf(row.original.record)" class="text-xs text-muted whitespace-nowrap">
                            {{ formatTime(submittedAtOf(row.original.record), siteTimeZone) }}
                        </span>
                        <span v-else class="text-xs text-gray-400">-</span>
                    </template>

                    <!-- score 列：打分输入 + 一键满分（未提交也允许打分） -->
                    <template #score-cell="{ row }">
                        <div class="flex items-center gap-1">
                            <UInput v-model.number="scoreMap[row.original.id]" type="number"
                                size="xs" class="w-16" min="0" :max="maxScore" step="any"
                                @blur="onScoreBlur(row.original)" @keydown.enter="$event.target.blur()" />
                            <UTooltip :text="$t('homework.quickScore')">
                                <UButton label="100%" color="primary" variant="soft" size="xs"
                                    @click="onQuickScore(row.original, maxScore)" />
                            </UTooltip>
                        </div>
                    </template>

                    <!-- comment 列：评语输入（未提交也允许写评语） -->
                    <template #comment-cell="{ row }">
                        <UInput v-model="commentMap[row.original.id]"
                            size="xs" class="w-44" :placeholder="$t('homework.commentPlaceholder')"
                            @blur="onCommentBlur(row.original)" @keydown.enter="$event.target.blur()" />
                    </template>

                    <!-- excellent 列：标为优秀（仅真实提交可标记） -->
                    <template #excellent-cell="{ row }">
                        <UButton v-if="hasSubmission(row.original.record)" size="xs" variant="soft"
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

    <!-- 一键全部满分确认 -->
    <UModal v-model:open="scoreAllConfirmOpen">
        <template #content>
            <div class="p-6 space-y-4">
                <h3 class="text-lg font-semibold">{{ $t('record.scoreAllConfirmTitle') }}</h3>
                <p class="text-sm text-gray-500">{{ $t('record.scoreAllConfirmDesc', { score: maxScore }) }}</p>
                <div class="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <UButton variant="soft" @click="scoreAllConfirmOpen = false">{{ $t('common.cancel') }}</UButton>
                    <UButton color="primary" :loading="scoringAll" @click="confirmScoreAll">{{ $t('common.confirm') }}</UButton>
                </div>
            </div>
        </template>
    </UModal>

    <!-- 作业详情弹窗（全屏逐份评阅） -->
    <!-- 布局：顶栏（左：用户卡片；右两行：评分/评语/标优秀 + 导航）/ 主区（左侧作答+附件列表，右侧预览） -->
    <UModal v-model:open="detailOpen" fullscreen>
        <template #content>
            <div v-if="detailData" class="h-full flex flex-col">
                <!-- 顶栏：用户卡片高度较高，右侧排两行内容 -->
                <div class="flex items-center gap-4 px-6 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
                    <AuthUserCard :user="detailUser" />

                    <div class="flex-1 flex flex-col gap-2 min-w-0">
                        <!-- 行 1：标优秀 + 序号 / 打分 + 切换 + 关闭 -->
                        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
                            <div class="flex items-center gap-2">
                                <!-- 标优秀 -->
                                <UButton size="sm" variant="soft"
                                    :color="excellentMap[detailData.id] ? 'warning' : 'gray'"
                                    :icon="excellentMap[detailData.id] ? 'i-heroicons-star-solid' : 'i-heroicons-star'"
                                    @click="toggleExcellent(detailData)">
                                    {{ excellentMap[detailData.id] ? $t('homework.excellent') : $t('homework.markExcellent') }}
                                </UButton>

                                <!-- 序号 / 总数 -->
                                <span class="text-xs font-medium text-muted whitespace-nowrap bg-gray-100 dark:bg-gray-800 rounded-full px-2.5 py-1">
                                    {{ detailIndex + 1 }}/{{ detailTotal }}
                                </span>

                                <!-- 提交时间 -->
                                <span v-if="detailSubmittedAt" class="text-xs text-muted whitespace-nowrap">
                                    {{ $t('record.submitTime') }}: {{ formatTime(detailSubmittedAt, siteTimeZone) }}
                                </span>
                            </div>

                            <div class="flex flex-wrap items-center gap-x-4 gap-y-2 ml-auto">
                                <!-- 打分 / 满分 -->
                                <div class="flex items-center gap-1.5">
                                    <label class="text-sm text-muted whitespace-nowrap">{{ $t('record.score') }}</label>
                                    <UInput v-model.number="scoreMap[detailData.id]" type="number" size="sm" class="w-20"
                                        min="0" :max="maxScore" step="any" :placeholder="String(maxScore)"
                                        @blur="onScoreBlur(detailData)" @keydown.enter="$event.target.blur()" />
                                    <span class="text-sm text-muted whitespace-nowrap">/ {{ maxScore }}</span>
                                    <UTooltip :text="$t('homework.quickScore')">
                                        <UButton label="100%" color="primary" variant="soft" size="sm"
                                            @click="onQuickScore(detailData, maxScore)" />
                                    </UTooltip>
                                </div>

                                <div class="flex items-center gap-1">
                                    <UTooltip :text="$t('record.homeworkDetail')">
                                        <UButton icon="i-lucide-chevron-left" variant="soft" size="sm" :disabled="detailTotal === 0"
                                            @click="prevSubmission" />
                                    </UTooltip>
                                    <UTooltip :text="$t('record.homeworkDetail')">
                                        <UButton icon="i-lucide-chevron-right" variant="soft" size="sm" :disabled="detailTotal === 0"
                                            @click="nextSubmission" />
                                    </UTooltip>
                                    <UTooltip :text="$t('common.close')">
                                        <UButton icon="i-heroicons-x-mark" color="warning" variant="soft" size="sm" class="ml-2" @click="closeDetail()" />
                                    </UTooltip>
                                </div>
                            </div>
                        </div>

                        <!-- 行 2：评语（占满右侧宽度） -->
                        <div class="flex items-center gap-1.5">
                            <label class="text-sm text-muted whitespace-nowrap">{{ $t('homework.comment') }}</label>
                            <UInput v-model="commentMap[detailData.id]" size="sm" class="flex-1"
                                :placeholder="$t('homework.commentPlaceholder')"
                                @blur="onCommentBlur(detailData)" @keydown.enter="$event.target.blur()" />
                        </div>
                    </div>
                </div>

                <!-- 主内容区 -->
                <div class="flex flex-1 overflow-hidden">
                    <!-- 左栏：仅在有附件时出现（作答内容 + 附件列表） -->
                    <aside v-if="fileItems.length"
                        class="w-[320px] border-r border-gray-200 dark:border-gray-800 p-4 overflow-y-auto space-y-5 shrink-0">
                        <!-- 作答内容（与附件并存时收在左栏） -->
                        <div v-if="detailRecord.content">
                            <label class="text-xs text-muted mb-1 block">{{ $t('homework.contentLabel') }}</label>
                            <div class="prose prose-sm dark:prose-invert max-w-none border border-gray-200 dark:border-gray-800 rounded-md p-3">
                                <ueditorRender v-if="isRichDoc(detailRecord.content)" :json="detailRecord.content" :course-id="props.courseId" />
                                <p v-else class="text-sm whitespace-pre-wrap break-words">{{ detailRecord.content }}</p>
                            </div>
                        </div>

                        <!-- 附件列表（纵向，点击切换预览） -->
                        <div>
                            <label class="text-xs text-muted mb-1.5 block">{{ $t('homework.uploadLabel') }}（{{ fileItems.length }}）</label>
                            <div class="space-y-1">
                                <div v-for="(file, i) in fileItems" :key="i"
                                    class="w-full flex items-center rounded-md transition-colors"
                                    :class="selectedFileIndex === i
                                        ? 'bg-primary-50 dark:bg-primary-950/40'
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'">
                                    <!-- 单文件下载与教师移除按钮 -->
                                    <UTooltip :text="$t('common.download')">
                                        <UButton icon="i-heroicons-arrow-down-tray" size="xs" color="neutral"
                                            variant="ghost" class="shrink-0"
                                            :loading="downloadingFileUrl === file.url"
                                            @click.stop="downloadFile(file)" />
                                    </UTooltip>
                                    <UTooltip v-if="canDeleteAttachment" :text="$t('record.deleteAttachment')">
                                        <UButton icon="i-heroicons-trash" size="xs" color="error"
                                            variant="ghost" class="shrink-0"
                                            :loading="deletingFileIndex === i"
                                            :disabled="deletingFileIndex !== null"
                                            @click.stop="confirmDeleteAttachment(file, i)" />
                                    </UTooltip>
                                    <button type="button"
                                        class="flex-1 min-w-0 flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm"
                                        :class="selectedFileIndex === i
                                            ? 'text-primary-500'
                                            : 'text-gray-600 dark:text-gray-300'"
                                        @click="selectedFileIndex = i">
                                        <UIcon :name="fileIcon(file.url)" class="w-4 h-4 shrink-0" />
                                        <span class="truncate">{{ file.name }}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </aside>

                    <!-- 右主区：附件预览 / 无附件时作答内容占满 / 均无时占位 -->
                    <div class="flex-1 p-5 overflow-hidden flex flex-col min-w-0">
                        <!-- 有附件：ueditor file 扩展模式预览（office/zip/text/3d 在线预览，图片/视频/pdf 原生渲染） -->
                        <div v-if="activeFile"
                            class="relative flex-1 overflow-auto border border-gray-200 dark:border-gray-800 rounded-md bg-white">
                            <UeditorFilePreview :key="activeFile.url" :url="activeFile.url" :name="activeFile.name" />
                        </div>

                        <!-- 无附件：作答内容占满主区 -->
                        <div v-else-if="detailRecord.content"
                            class="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-800 rounded-md p-5 bg-white dark:bg-gray-900">
                            <ueditorRender v-if="isRichDoc(detailRecord.content)" :json="detailRecord.content" :course-id="props.courseId" />
                            <p v-else class="text-sm whitespace-pre-wrap break-words">{{ detailRecord.content }}</p>
                        </div>

                        <!-- 无内容也无附件 -->
                        <div v-else class="flex-1 flex flex-col items-center justify-center gap-2 text-muted">
                            <UIcon name="i-heroicons-inbox" class="w-10 h-10" />
                            <span class="text-sm">{{ $t('homework.noContent') }}</span>
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
import UeditorFilePreview from '../../../ueditor/render/nodes/file-preview.vue'

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    courseId: { type: Number, default: 0 },
    cid: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    homeworkName: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

// 时间显示统一用站点时区（如北京），避免因浏览器时区不同显示偏移
const { siteTimeZone } = useSiteConfig()

const {
    open, rows, pending, extraColumns, defaultSort, scoreMap, commentMap, excellentMap, fetchRecords,
    onScoreBlur, onQuickScore, onCommentBlur, toggleExcellent,
    downloadingAll, downloadAllFiles, downloadingFileUrl, downloadFile, deleteAttachment,
    scoringAll, scoreAllSubmitted,
    detailOpen, detailData, detailRecord, detailSubmittedAt, detailIndex, detailTotal,
    openHomeworkDetail, prevSubmission, nextSubmission, closeDetail, isRichDoc, hasSubmission, submittedAtOf,
} = useHomeworkRecords(props, emit)

// 一键全部满分：二次确认后执行，避免误覆盖已有分数
const scoreAllConfirmOpen = ref(false)
async function confirmScoreAll() {
    scoreAllConfirmOpen.value = false
    await scoreAllSubmitted()
}

// ==================== 文件预览 ====================
// useFileNames 由 base 模块 addImportsDir 全局自动导入，返回 { url, name }（name 含原始文件名）
const selectedFileIndex = ref(0)
const fileItems = useFileNames(() => detailRecord.value?.files ?? [])
const activeFile = computed(() => fileItems.value[selectedFileIndex.value] ?? null)
const activeFilePreviewable = computed(() => !!activeFile.value && isPreviewableFile(activeFile.value.url))
const deletingFileIndex = ref(null)
const { hasRole } = useAuth()
const { t } = useI18n()
const canDeleteAttachment = computed(() => hasRole('teacher') || hasRole('admin'))

async function confirmDeleteAttachment(file, index) {
    if (!canDeleteAttachment.value || deletingFileIndex.value !== null) return
    if (!window.confirm(t('record.confirmDeleteAttachment'))) return
    deletingFileIndex.value = index
    try {
        await deleteAttachment(file, index)
        if (index < selectedFileIndex.value) selectedFileIndex.value--
        else selectedFileIndex.value = Math.min(selectedFileIndex.value, fileItems.value.length - 1)
    } finally {
        deletingFileIndex.value = null
    }
}

// 按扩展名给附件列表配类型图标
function fileIcon(url) {
    const ext = (url || '').split('?')[0].split('.').pop()?.toLowerCase() || ''
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'i-heroicons-photo'
    if (ext === 'pdf') return 'i-heroicons-document-text'
    if (['doc', 'docx', 'txt', 'md'].includes(ext)) return 'i-heroicons-document-text'
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'i-heroicons-table-cells'
    if (['ppt', 'pptx'].includes(ext)) return 'i-heroicons-presentation-chart-bar'
    return 'i-heroicons-paperclip'
}

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
        avatarFrame: d.avatarFrame || null,
    }
})
</script>
