<template>
    <!-- 分页控件：只要有子评论就显示（学生端按班级过滤后通常不足一页，也需能看到翻页/每页数量按钮） -->
    <div v-if="children.length > 0" class="flex flex-wrap items-center justify-between gap-2 pt-2">
        <span class="text-xs text-gray-400">
            {{ (page - 1) * pageSize + 1 }}-{{ Math.min(page * pageSize, children.length) }} / {{ children.length }}
        </span>
        <div class="flex items-center gap-2">
            <!-- 每页数量选择 -->
            <select v-model="pageSize"
                class="text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-gray-600 dark:text-gray-300">
                <option :value="10">10 {{ $t('comment.perPageUnit') }}</option>
                <option :value="20">20 {{ $t('comment.perPageUnit') }}</option>
                <option :value="50">50 {{ $t('comment.perPageUnit') }}</option>
            </select>
            <div class="flex items-center gap-1">
                <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-chevron-left"
                    :disabled="page <= 1" @click="page--" />
                <span class="text-xs text-gray-400">{{ page }} / {{ totalPages }}</span>
                <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-chevron-right"
                    :disabled="page >= totalPages" @click="page++" />
            </div>
        </div>
    </div>
</template>

<script setup>
import { useCommentRenderContext } from '../useCommentRender'

const { children, pageSize, page, totalPages } = useCommentRenderContext()
</script>