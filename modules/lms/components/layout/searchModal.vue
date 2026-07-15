<template>
    <div class="flex flex-col max-h-[70vh]">
        <!-- SearchInput Box -->
        <div class="flex items-center gap-2 p-4 border-b border-default">
            <UIcon name="i-lucide-search" class="size-5 text-muted shrink-0" />
            <UInput ref="inputRef" v-model="keyword" :placeholder="$t('common.search') + '...'" variant="none"
                class="flex-1 text-base" autofocus @keydown.escape="$emit('close')"
                @keydown.down.prevent="moveSelection(1)" @keydown.up.prevent="moveSelection(-1)"
                @keydown.enter.prevent="selectResult(selectedIndex)" />
            <span class="text-xs text-muted shrink-0">
                {{ filteredResults.length }}
            </span>
        </div>

        <!-- Search ResultsList -->
        <div class="overflow-y-auto flex-1">
            <div v-if="loading" class="flex items-center justify-center py-12">
                <UIcon name="i-lucide-loader-circle" class="size-6 text-muted animate-spin" />
            </div>

            <div v-else-if="!keyword.trim()" class="px-4 py-12 text-center text-sm text-muted">
                <UIcon name="i-lucide-search" class="size-10 text-muted mx-auto mb-3 opacity-40" />
                <p>{{ $t('searchModal.knowledgeCount', { count: allEntries.length }) }}</p>
            </div>

            <div v-else-if="filteredResults.length === 0" class="px-4 py-12 text-center text-sm text-muted">
                <UIcon name="i-lucide-search-x" class="size-10 text-muted mx-auto mb-3 opacity-40" />
                <p>{{ $t('searchModal.no results') }}</p>
            </div>

            <div v-else class="py-2">
                <div v-for="(entry, index) in filteredResults" :key="index" ref="resultItems"
                    class="px-4 py-3 cursor-pointer transition-colors hover:bg-muted"
                    :class="{ 'bg-muted': index === selectedIndex }" @click="selectResult(index)"
                    @mouseenter="selectedIndex = index">
                    <div class="flex items-start gap-2">
                        <UIcon :name="entry.type === 'heading' ? 'i-lucide-heading' : 'i-lucide-text'"
                            class="size-4 mt-0.5 shrink-0"
                            :class="entry.type === 'heading' ? 'text-primary' : 'text-muted'" />

                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-highlighted line-clamp-2 leading-snug">
                                <span v-for="(seg, si) in highlightText(entry.text)" :key="si"
                                    :class="{ 'bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 rounded-sm px-0.5': seg.highlight }">{{
                                        seg.text }}</span>
                            </p>

                            <div class="flex items-center gap-1.5 mt-1 text-xs text-muted">
                                <span class="truncate max-w-[280px]">{{ entry.sourceName }}</span>
                            </div>
                        </div>

                        <UIcon name="i-lucide-arrow-up-right" class="size-3.5 text-muted shrink-0 mt-0.5" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useSearchModal } from './useSearchModal'

const emit = defineEmits(['close'])

const {
    keyword, inputRef, resultItems, moveSelection, selectResult, selectedIndex,
    filteredResults, loading, allEntries, highlightText,
} = useSearchModal(emit)
</script>
