<template>
    <div class="flex-1 overflow-y-auto p-4">
        <!-- 加载中 -->
        <div v-if="loading" class="flex items-center justify-center py-10 text-gray-400">
            <UIcon name="i-lucide-loader-2" class="animate-spin size-5 mr-2" />
            <span class="text-sm">{{ t('common.loading') }}</span>
        </div>
        <!-- 预览模式：单条预览 -->
        <template v-else-if="previewMode">
            <div v-if="filtered.length && currentItem"
                class="rounded-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
                <div class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800">
                    <span class="text-sm font-medium flex-1 truncate">{{ currentItem.name || t('common.unnamed') }}</span>
                    <span class="text-xs text-gray-400">#{{ currentItem.cid }}</span>
                </div>
                <div class="p-3">
                    <component :is="renderComp" :key="currentItem.cid" :node="renderNode" />
                </div>
            </div>
            <div v-else class="flex items-center justify-center h-full text-gray-400 text-sm">{{ t('courseData.empty') }}</div>
        </template>
        <!-- 选择模式：分页列表 -->
        <template v-else>
            <div v-if="pagedItems.length" class="space-y-3">
                <div v-for="item in pagedItems" :key="item.cid"
                    class="rounded-lg border-2 transition-all overflow-hidden"
                    :class="isSelected(item.cid) ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'">
                    <div class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 cursor-pointer" @click="toggle(item.cid)">
                        <UIcon :name="isSelected(item.cid) ? 'i-lucide-check-circle' : 'i-lucide-circle'" class="size-4 shrink-0"
                            :class="isSelected(item.cid) ? 'text-primary' : 'text-muted'" />
                        <span class="text-sm font-medium flex-1 truncate">{{ item.name || t('common.unnamed') }}</span>
                        <span class="text-xs text-gray-400">#{{ item.cid }}</span>
                        <UButton icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" @click.stop="editItem(item)" />
                        <UPopover :modal="true">
                            <UButton icon="i-lucide-trash" size="xs" color="neutral" variant="ghost" @click.stop />
                            <template #content>
                                <div class="p-3 space-y-2 w-48">
                                    <p class="text-sm text-gray-600 dark:text-gray-300">{{ t('courseData.confirmDelete') }}</p>
                                    <div class="flex justify-end gap-2">
                                        <UButton size="xs" color="error" @click="deleteItem(item)">{{ t('common.delete') }}</UButton>
                                    </div>
                                </div>
                            </template>
                        </UPopover>
                    </div>
                    <div class="p-3">
                        <component :is="renderComp" :node="{ attrs: { type: singularType, content: String(item.cid) } }" />
                    </div>
                </div>
            </div>
            <div v-else class="flex items-center justify-center h-full text-gray-400 text-sm">{{ t('courseData.empty') }}</div>
        </template>
    </div>
</template>

<script setup>
import { useContentPickerContext } from './useContentPicker'
const { t, loading, previewMode, filtered, currentItem, renderNode, renderComp, pagedItems, isSelected, toggle, editItem, deleteItem, singularType } = useContentPickerContext()
</script>
