<template>
    <div class="comment-render w-full space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 relative"
        :data-comment-id="commentId">
        <!-- CommentNot Found -->
        <div v-if="!comment" class="text-center py-6 text-gray-400">
            {{ $t('comment.notFound') }} (cid: {{ commentId }})
        </div>

        <template v-else>
            <!-- CommentTitle -->
            <div class="flex items-center gap-3 mb-3">
                <span class="px-2 py-0.5 bg-teal-50 dark:bg-teal-800 text-teal-600 dark:text-teal-300 rounded text-xs font-medium">
                    {{ $t('comment.label') }}
                </span>
                <span class="font-semibold text-gray-800 dark:text-gray-200">{{ comment.name }}</span>
                <span v-if="commentId" class="text-xs text-gray-400">#{{ commentId }}</span>
                <div class="flex items-center gap-2 ml-auto">
                    <UButton v-if="isTeacher" icon="i-lucide-edit" variant="ghost" size="2xs"
                        class="opacity-50 hover:opacity-100 transition-opacity"
                        @click="editOpen = true" />
                    <UButton v-if="moduleLms && isTeacher" icon="i-heroicons-clipboard" variant="ghost" size="2xs"
                        class="opacity-50 hover:opacity-100 transition-opacity"
                        @click="recordsOpen = true" />
                    <span class="text-xs text-gray-400">{{ comment.point }}{{ $t('question.points') }}</span>
                </div>
            </div>

            <!-- Comment Content -->
            <div class="prose prose-sm dark:prose-invert max-w-none">
                <ueditorRender :json="comment.content" :course-id="effectiveCourseId" />
            </div>

            <!-- Tag -->
            <div v-if="comment.tags && comment.tags.length" class="flex flex-wrap gap-1">
                <span v-for="(tag, idx) in comment.tags" :key="idx"
                    class="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded text-xs">
                    {{ tag }}
                </span>
            </div>

            <!-- Commentarea：Showself + AllSonComment -->
            <div class="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
                <!-- Loading -->
                <div v-if="listPending" class="flex items-center justify-center py-4 text-gray-400">
                    <UIcon name="i-lucide-loader-2" class="animate-spin size-4 mr-2" />
                    <span class="text-xs">{{ $t('comment.loading') }}</span>
                </div>
                <template v-else>
                    <!-- ReplyForm -->
                    <CommentForm :parent-cid="commentId" :placeholder="$t('comment.replyPlaceholder')"
                        @submit="onReply" />

                    <!-- SonComment List（Pagination） -->
                    <CommentList :comments="pagedChildren" :current-user-id="user?.id"
                        @toggle-like="toggleLike" @delete="onDelete" />

                    <!-- Paginationcontrol -->
                    <CommentPagination />
                </template>
            </div>
        </template>

        <!-- Edit Modal -->
        <Edit v-model="editOpen" :comment-id="commentId" :comment="comment" @saved="onSaved" />

        <!-- RecordsModal（onlyTeacher） -->
        <LmsRecordsModalComment v-if="isTeacher" v-model="recordsOpen"
            :course-id="courseId" :cid="commentId" />
    </div>
</template>

<script setup>
import { useCommentRender } from './useCommentRender'
import CommentForm from './render/comment-form.vue'
import CommentList from './render/comment-list.vue'
import CommentPagination from './render/pagination.vue'
import Edit from './edit.vue'

const props = defineProps({
    node: Object,
    comment: Object,
    courseId: { type: [Number, String], default: undefined }, // admin BackreplayTime Usedpass in
})

const {
    effectiveCourseId, moduleLms, RecordsModal, comment, commentId, isTeacher, user,
    editOpen, recordsOpen, listPending, pagedChildren,
    onReply, toggleLike, onDelete, onSaved,
} = useCommentRender(props)
</script>

<style scoped>
.comment-render {
    width: 100%;
}
</style>
