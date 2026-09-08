<template>
    <div class="comment-render w-full space-y-4 p-4 border border-amber-400 dark:border-amber-500 rounded-lg bg-white dark:bg-gray-900 relative"
        :data-comment-id="commentId">
        <!-- 评论未找到 -->
        <div v-if="!comment" class="text-center py-6 text-gray-400">
            {{ $t('comment.notFound') }} (cid: {{ commentId }})
        </div>

        <template v-else>
            <!-- 评论标题 -->
            <div class="flex items-center gap-3 mb-3">
                <span class="px-2 py-0.5 bg-teal-50 dark:bg-teal-800 text-teal-600 dark:text-teal-300 rounded text-xs font-medium">
                    {{ $t('comment.label') }}
                </span>
                <span class="font-semibold text-gray-800 dark:text-gray-200">{{ comment.name }}</span>
                <span v-if="commentId" class="text-xs text-gray-400">#{{ commentId }}</span>
                <div class="flex items-center gap-2 ml-auto">
                    <UButton v-if="isTeacher && comment.status === 'audit'" icon="i-heroicons-check-badge"
                        color="amber" variant="ghost" size="2xs"
                        class="opacity-70 hover:opacity-100 transition-opacity"
                        @click="onApprove(comment)">{{ $t('comment.approve') }}</UButton>
                    <UButton v-if="isTeacher" icon="i-lucide-edit" variant="ghost" size="2xs"
                        class="opacity-50 hover:opacity-100 transition-opacity"
                        @click="editOpen = true" />
                    <UButton v-if="moduleLms && isTeacher" icon="i-heroicons-clipboard" variant="ghost" size="2xs"
                        class="opacity-50 hover:opacity-100 transition-opacity"
                        @click="recordsOpen = true" />
                    <UTooltip :text="$t('common.refresh')">
                        <UButton icon="i-lucide-refresh-cw" variant="ghost" size="2xs"
                            class="opacity-50 hover:opacity-100 transition-opacity" :loading="listPending"
                            @click="fetchComments()" />
                    </UTooltip>
                    <span class="text-xs text-gray-400">{{ comment.point }}{{ $t('question.points') }}</span>
                </div>
            </div>

            <!-- 评论内容 -->
            <div class="prose prose-sm dark:prose-invert max-w-none">
                <ueditorRender :json="comment.content" :course-id="effectiveCourseId" />
            </div>

            <!-- 标签 -->
            <div v-if="comment.tags && comment.tags.length" class="flex flex-wrap gap-1">
                <span v-for="(tag, idx) in comment.tags" :key="idx"
                    class="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded text-xs">
                    {{ tag }}
                </span>
            </div>

            <!-- 评论区：显示自己 + 所有子评论 -->
            <div class="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
                <!-- 加载中 -->
                <div v-if="listPending" class="flex items-center justify-center py-4 text-gray-400">
                    <UIcon name="i-lucide-loader-2" class="animate-spin size-4 mr-2" />
                    <span class="text-xs">{{ $t('comment.loading') }}</span>
                </div>
                <template v-else>
                    <!-- 分页控件：放在所有评论上方 -->
                    <CommentPagination />

                    <!-- 回复表单 -->
                    <CommentForm :parent-cid="commentId" :placeholder="$t('comment.replyPlaceholder')"
                        @submit="onReply" />

                    <!-- 子评论列表（分页） -->
                    <CommentList :comments="pagedChildren" :current-user-id="user?.id"
                        @toggle-like="toggleLike" @delete="onDelete" @approve="onApprove" />
                </template>
            </div>
        </template>

        <!-- 编辑弹窗 -->
        <Edit v-model="editOpen" :comment-id="commentId" :comment="comment" @saved="onSaved" />

        <!-- 记录弹窗（仅教师） -->
        <LmsRecordsModalComment v-if="isTeacher" v-model="recordsOpen"
            :course-id="courseId" :cid="commentId" />
    </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useCommentRender } from './useCommentRender'
import CommentForm from './render/comment-form.vue'
import CommentList from './render/comment-list.vue'
import CommentPagination from './render/pagination.vue'
import Edit from './edit.vue'

const props = defineProps({
    node: Object,
    comment: Object,
    courseId: { type: [Number, String], default: undefined }, // admin 后台复用时传入
})

const {
    effectiveCourseId, moduleLms, RecordsModal, comment, commentId, isTeacher, user,
    editOpen, recordsOpen, listPending, pagedChildren, fetchComments,
    onReply, toggleLike, onDelete, onApprove, onSaved,
} = useCommentRender(props)

// 审核通过实时刷新：服务端审核通过后向该评论所在班级广播 commentRefresh，
// 当广播与当前主题(courseId + topicCid)匹配时刷新评论列表
onMounted(() => {
    if (import.meta.server || typeof registerWsHandler !== 'function') return
    const unregister = registerWsHandler('commentRefresh', (data) => {
        if (Number(data.courseId) !== effectiveCourseId.value) return
        if (Number(data.topicCid) !== commentId.value) return
        fetchComments()
    })
    onUnmounted(unregister)
})
</script>

<style scoped>
.comment-render {
    width: 100%;
}
</style>
