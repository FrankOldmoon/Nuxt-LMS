<template>
    <!-- Paginationcontrol -->
    <div v-if="children.length > pageSize" class="flex items-center justify-between pt-2">
        <span class="text-xs text-gray-400">
            {{ (page - 1) * pageSize + 1 }}-{{ Math.min(page * pageSize, children.length) }} / {{ children.length }}
        </span>
        <div class="flex items-center gap-1">
            <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-chevron-left"
                :disabled="page <= 1" @click="page--" />
            <span class="text-xs text-gray-400">{{ page }} / {{ totalPages }}</span>
            <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-chevron-right"
                :disabled="page >= totalPages" @click="page++" />
        </div>
    </div>
</template>

<script setup>
import { useCommentRenderContext } from '../useCommentRender'

const { children, pageSize, page, totalPages } = useCommentRenderContext()
</script>
