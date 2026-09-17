<template>
    <!-- 已发表过评论（提交即绿；重新进入时若已有自己的发表记录同样为绿）→ 绿色外框，与作业一致 -->
    <div class="comment-render w-full space-y-4 p-4 rounded-xl bg-white dark:bg-gray-900 relative shadow-sm transition-shadow duration-200 hover:shadow-md"
        :class="hasPosted
            ? 'border-2 border-green-400 dark:border-green-500'
            : 'border border-amber-400 dark:border-amber-500'"
        :data-comment-id="commentId">
        <!-- 评论未找到 -->
        <div v-if="!comment" class="text-center py-6 text-gray-400">
            {{ $t('comment.notFound') }} (cid: {{ commentId }})
        </div>

        <template v-else>
            <!-- 评论标题 -->
            <div class="flex items-center gap-3 mb-3 flex-wrap">
                <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold text-white bg-teal-500 bg-linear-to-r from-teal-500 to-cyan-500 shadow-sm">
                    {{ $t('comment.label') }}
                </span>
                <span class="font-semibold text-gray-800 dark:text-gray-200">{{ comment.name }}</span>
                <span v-if="commentId" class="text-xs text-gray-400">#{{ commentId }}</span>
                <div class="flex items-center gap-2 ml-auto">
                    <!-- 待审核标识：作者本人也能看到自己未过审的评论，需要知道它还没公开 -->
                    <span v-if="comment.status === 'audit'"
                        class="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300">
                        <UIcon name="i-heroicons-clock" class="w-3.5 h-3.5" />
                        <span>{{ $t('comment.auditPending') }}</span>
                    </span>
                    <UButton v-if="isTeacher && comment.status === 'audit'" icon="i-heroicons-check-badge"
                        color="success" variant="soft" size="2xs"
                        @click="onApprove(comment)">{{ $t('comment.approve') }}</UButton>
                    <UButton v-if="isTeacher" icon="i-lucide-edit" color="secondary" variant="soft" size="2xs"
                        @click="editOpen = true" />
                    <UButton v-if="moduleLms && isTeacher" icon="i-heroicons-clipboard" color="info" variant="subtle"
                        size="2xs" @click="recordsOpen = true" />
                    <UTooltip :text="$t('common.refresh')">
                        <UButton icon="i-lucide-refresh-cw" color="neutral" variant="soft" size="2xs"
                            :loading="listPending" @click="fetchComments()" />
                    </UTooltip>
                    <span
                        class="px-2 py-0.5 rounded-full text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/50">
                        {{ comment.point }}{{ $t('question.points') }}
                    </span>
                </div>
            </div>

            <!-- 评论内容 -->
            <div class="prose prose-sm dark:prose-invert max-w-none">
                <ueditorRender :json="comment.content" :course-id="effectiveCourseId" />
            </div>

            <!-- 标签 -->
            <div v-if="comment.tags && comment.tags.length" class="flex flex-wrap gap-1.5">
                <span v-for="(tag, idx) in comment.tags" :key="idx"
                    class="px-2 py-0.5 rounded-full text-xs font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-300">
                    {{ tag }}
                </span>
            </div>

            <!-- 评论区：显示自己 + 所有子评论 -->
            <div class="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3 rounded-lg bg-gray-50/60 dark:bg-gray-800/30 p-3">
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
    editOpen, recordsOpen, listPending, pagedChildren, hasPosted, fetchComments,
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
