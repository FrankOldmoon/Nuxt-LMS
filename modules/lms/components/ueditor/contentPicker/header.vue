<template>
    <div class="p-4 space-y-3 shrink-0 border-b border-gray-100 dark:border-gray-800">
        <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">{{ title }}</h3>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="open = false" />
        </div>
        <!-- Selectmode：SelectedTag -->
        <div v-if="!previewMode && selected.length" class="flex flex-wrap gap-1.5">
            <UBadge v-for="cid in selected" :key="cid" color="primary" variant="subtle" size="xs"
                class="cursor-pointer" @click="toggle(cid)">
                #{{ cid }}
                <UIcon name="i-lucide-x" class="size-3 ml-0.5" />
            </UBadge>
        </div>
        <!-- Previewmode：Type filter + Search + Add + Import + Export -->
        <div v-if="previewMode" class="flex items-center gap-2">
            <USelect v-model="filterType" :items="typeOptions" size="sm" class="w-32" />
            <UInput v-model="keyword" :placeholder="t('courseData.searchPlaceholder')" icon="i-lucide-search" size="sm" class="flex-1" />
            <UButton size="sm" color="info" variant="soft" icon="i-lucide-plus" @click="addNew">{{ t('common.add') }}</UButton>
            <UButton size="sm" color="primary" variant="soft" icon="i-lucide-upload" @click="importOpen = true">{{ t('courseData.import') }}</UButton>
            <UButton size="sm" color="warning" variant="soft" icon="i-lucide-download" :disabled="!filtered.length" @click="exportItems">{{ t('courseData.export') }}</UButton>
        </div>
        <!-- Selectmode：Search + Add + Import + Export -->
        <div v-if="!previewMode" class="flex items-center gap-2">
            <UInput v-model="keyword" :placeholder="t('courseData.searchPlaceholder')" icon="i-lucide-search" size="sm" class="flex-1" />
            <UButton size="sm" color="primary" variant="soft" icon="i-lucide-plus" @click="addNew">{{ t('common.add') }}</UButton>
            <UButton size="sm" color="primary" variant="soft" icon="i-lucide-upload" @click="importOpen = true">{{ t('courseData.import') }}</UButton>
            <UButton size="sm" color="primary" variant="soft" icon="i-lucide-download" :disabled="!filtered.length" @click="exportItems">{{ t('courseData.export') }}</UButton>
        </div>
    </div>
</template>

<script setup>
import { useContentPickerContext } from './useContentPicker'
const { t, open, title, previewMode, selected, filterType, typeOptions, keyword, addNew, importOpen, exportItems, filtered, toggle } = useContentPickerContext()
</script>
