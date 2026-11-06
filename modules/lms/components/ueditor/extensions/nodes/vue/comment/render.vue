<template>
    <!-- 已发表过评论（提交即绿；重新进入时若已有自己的发表记录同样为绿）→ 绿色外框，与作业一致 -->
    <div class="comment-render w-full space-y-4 p-4 rounded-xl bg-white dark:bg-gray-900 relative shadow-sm transition-shadow duration-200 hover:shadow-md"
        :class="isUnset
            ? unsetBorderClass
            : (hasPosted
                ? 'border-2 border-green-400 dark:border-green-500'
                : 'border border-amber-400 dark:border-amber-500')"
        :data-comment-id="commentId">
        <!-- 尚未设置内容：节点没有 cid → 不渲染空评论，只提示去设置 -->
        <div v-if="isUnset" class="flex items-start gap-2 text-sm text-red-500">
            <UIcon name="i-lucide-circle-alert" class="size-4 shrink-0 mt-0.5" />
            <div>
                <p class="font-medium">{{ $t('comment.unsaved') }}</p>
                <p class="text-xs mt-1 text-red-400 dark:text-red-400/80">
                    {{ isTeacher ? $t('comment.unsavedHint') : $t('common.contentPending') }}
                </p>
            </div>
        </div>

        <!-- 评论不存在 -->
        <div v-else-if="!comment" class="text-center py-6 text-gray-400">
            <span v-if="!pending">{{ $t('comment.notFound') }} (cid: {{ commentId }})</span>
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
                <!-- 加载中：仅首次加载（还没有任何子评论）时用占位，
                     手动刷新时保留原列表原地更新，避免整块卸载重建造成跳动 -->
                <div v-if="listPending && !pagedChildren.length" class="flex items-center justify-center py-4 text-gray-400">
                    <UIcon name="i-lucide-loader-2" class="animate-spin size-4 mr-2" />
                    <span class="text-xs">{{ $t('comment.loading') }}</span>
                </div>
                <template v-else>
                    <!-- 分页控件：放在所有评论上方 -->
                    <CommentPagination />

                    <!-- 回复表单（仅登录用户显示） -->
                    <CommentForm v-if="user" :parent-cid="commentId" :placeholder="$t('comment.replyPlaceholder')"
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
        <LmsRecordsModalComment v-if="isTeacher && !isUnset" v-model="recordsOpen"
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
    effectiveCourseId, moduleLms, RecordsModal, comment, commentId, isUnset, isTeacher, user,
    editOpen, recordsOpen, listPending, pagedChildren, hasPosted, pending, fetchComments,
    onReply, toggleLike, onDelete, onApprove, onSaved,
    markApprovedLocal, consumeSelfApproved,
} = useCommentRender(props)

// 未设置内容时的外框（虚线红色，明显区别于正常评论）
const unsetBorderClass = 'border-2 border-dashed border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20'

// 审核通过实时刷新：服务端审核通过后向该评论所在班级广播 commentRefresh，
// 当广播与当前主题(courseId + topicCid)匹配时更新评论列表。
// 关键：审核只影响一条评论的 status，绝不能整块重拉列表 —— 重拉会让 loading 占位替换掉
// 列表 + 回复表单（正在输入的回复会丢），高度突变造成界面跳动。
onMounted(() => {
    if (import.meta.server || typeof registerWsHandler !== 'function') return
    const unregister = registerWsHandler('commentRefresh', (data) => {
        if (Number(data.courseId) !== effectiveCourseId.value) return
        if (Number(data.topicCid) !== commentId.value) return
        const cid = Number(data.cid) || 0
        // 1) 自己刚点过审核：本地已就地更新，忽略自己触发的广播
        if (consumeSelfApproved(cid)) return
        // 2) 别人审核的：能定位到具体条目就只改这一条的 status，不动其他节点
        if (cid && markApprovedLocal(cid)) return
        // 3) 定位不到（旧版服务端没带 cid / 该条不在当前页）：静默刷新，不显示 loading
        fetchComments({ silent: true })
    })
    onUnmounted(unregister)
})
</script>

<style scoped>
.comment-render {
    width: 100%;
}
</style>
