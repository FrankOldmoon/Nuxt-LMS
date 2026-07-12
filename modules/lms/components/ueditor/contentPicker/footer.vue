<template>
    <div class="p-4 shrink-0 border-t border-gray-100 dark:border-gray-800 space-y-2">
        <!-- 预览模式：导航 + 编辑/删除 -->
        <template v-if="previewMode">
            <div v-if="filtered.length" class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-1">
                    <UButton icon="i-lucide-chevron-left" size="sm" color="neutral" variant="ghost" @click="prev" />
                    <span class="text-xs text-gray-400">{{ currentIndex + 1 }} / {{ filtered.length }}</span>
                    <UButton icon="i-lucide-chevron-right" size="sm" color="neutral" variant="ghost" @click="next" />
                </div>
                <div class="flex items-center gap-2">
                    <UButton size="sm" color="primary" variant="soft" icon="i-lucide-pencil" :disabled="!currentItem" @click="editCurrent">{{ t('common.edit') }}</UButton>
                    <UPopover :modal="true">
                        <UButton size="sm" color="error" variant="soft" icon="i-lucide-trash" :disabled="!currentItem">{{ t('common.delete') }}</UButton>
                        <template #content>
                            <div class="p-3 space-y-2 w-48">
                                <p class="text-sm text-gray-600 dark:text-gray-300">{{ t('courseData.confirmDelete') }}</p>
                                <div class="flex justify-end gap-2">
                                    <UButton size="xs" color="error" @click="deleteCurrent">{{ t('common.delete') }}</UButton>
                                </div>
                            </div>
                        </template>
                    </UPopover>
                </div>
            </div>
        </template>
        <!-- 选择模式：分页 + 确认插入 -->
        <template v-else>
            <div v-if="filtered.length" class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-400">{{ (page - 1) * pageSize + 1 }}-{{ Math.min(page * pageSize, filtered.length) }} / {{ filtered.length }}</span>
                    <USelect v-model="pageSize" :items="pageSizeOptions" size="xs" class="w-16" />
                </div>
                <div class="flex items-center gap-1">
                    <UButton icon="i-lucide-chevron-left" size="xs" color="neutral" variant="ghost" @click="prevPage" />
                    <span class="text-xs text-gray-400">{{ page }} / {{ totalPages }}</span>
                    <UButton icon="i-lucide-chevron-right" size="xs" color="neutral" variant="ghost" @click="nextPage" />
                </div>
            </div>
            <div class="flex items-center justify-between">
                <span class="text-xs text-gray-400">{{ selected.length }} {{ t('courseData.selected') }}</span>
                <div class="flex gap-2">
                    <UButton variant="ghost" size="sm" @click="open = false">{{ t('common.cancel') }}</UButton>
                    <UButton color="primary" size="sm" :disabled="!selected.length" @click="confirm">{{ t('courseData.confirmInsert') }} ({{ selected.length }})</UButton>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup>
import { useContentPickerContext } from './useContentPicker'
const { t, open, previewMode, filtered, currentIndex, prev, next, currentItem, editCurrent, deleteCurrent, page, pageSize, pageSizeOptions, totalPages, prevPage, nextPage, selected, confirm } = useContentPickerContext()
</script>
