<template>
    <div class="comment-render w-full space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 relative"
        :data-comment-id="commentId">
        <!-- 加载中 -->
        <div v-if="pending" class="flex items-center justify-center py-6 text-gray-400">
            <UIcon name="i-lucide-loader-2" class="animate-spin size-4 mr-2" />
            <span class="text-xs">{{ $t('comment.loading') }}</span>
        </div>

        <!-- 评论未找到 -->
        <div v-else-if="!comment" class="text-center py-6 text-gray-400">
            {{ $t('comment.notFound') }} (cid: {{ commentId }})
        </div>

        <template v-else>
            <!-- 右上角编辑按钮（仅教师） -->
            <div v-if="isTeacher" class="absolute top-2 right-2 flex items-center gap-1 z-10">
                <UButton icon="i-heroicons-pencil-square" variant="ghost" size="2xs"
                    class="opacity-50 hover:opacity-100 transition-opacity"
                    @click="editOpen = true" />
            </div>

            <!-- 评论标题 -->
            <div class="flex items-center gap-3 mb-3 pr-6">
                <span class="px-2 py-0.5 bg-teal-50 dark:bg-teal-800 text-teal-600 dark:text-teal-300 rounded text-xs font-medium">
                    {{ $t('comment.label') }}
                </span>
                <span class="font-semibold text-gray-800 dark:text-gray-200">{{ comment.name }}</span>
                <span v-if="commentId" class="text-xs text-gray-400">#{{ commentId }}</span>
                <div class="flex items-center gap-2 ml-auto">
                    <UButton v-if="isTeacher" icon="i-heroicons-clipboard" variant="ghost" size="2xs"
                        class="opacity-50 hover:opacity-100 transition-opacity"
                        @click="recordsOpen = true" />
                    <span class="text-xs text-gray-400">{{ comment.point }}{{ $t('question.points') }}</span>
                </div>
            </div>

            <!-- 评论内容 -->
            <div class="prose prose-sm dark:prose-invert max-w-none">
                <ueditorRender :json="comment.content" />
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
                    <!-- 回复表单 -->
                    <CommentForm :parent-cid="commentId" :placeholder="$t('comment.replyPlaceholder')"
                        @submit="onReply" />

                    <!-- 子评论列表（分页） -->
                    <CommentList :comments="pagedChildren" :current-user-id="user?.id"
                        @toggle-like="toggleLike" @delete="onDelete" />

                    <!-- 分页控件 -->
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
            </div>
        </template>

        <!-- 编辑弹窗 -->
        <CommentEdit v-model="editOpen" :comment-id="commentId" :comment="comment" @saved="onSaved" />

        <!-- 记录弹窗（仅教师） -->
        <RecordsModal v-if="isTeacher" v-model="recordsOpen" :course-id="editableCourseId"
            :cid="commentId" />
    </div>
</template>

<script setup>
import { reactive, ref, computed, watch } from 'vue'
import CommentEdit from '../../../extensions/nodes/vue/comment/edit.vue'
import CommentForm from './comment/comment-form.vue'
import CommentList from './comment/comment-list.vue'
import RecordsModal from './comment/records-modal.vue'

const props = defineProps({
    node: Object,
})
const emit = defineEmits(['init'])

const { editableCourseId } = useLayoutState()
const { user, hasRole } = useAuth()
const chapterTask = useChapterTask()

const commentId = computed(() => Number(props.node?.attrs?.content) || 0)
const isTeacher = computed(() => hasRole('teacher') || hasRole('admin'))

// 默认评论（commentId 为空时填充，便于新建）
const defaultComment = reactive({
    name: '',
    content: '',
    tags: [],
    point: 1,
})

// SSR-friendly data fetching
const apiUrl = computed(() => {
    if (!commentId.value || !editableCourseId.value) return ''
    return `/api/lms/comments/show?course_id=${editableCourseId.value}&cid=${commentId.value}`
})

const { data: fetchedComment, pending: fetchedPending, refresh } = cRequest.use(apiUrl, {
    transform: (raw) => {
        if (!raw) return null
        return reactive({
            name: raw.name || '',
            content: raw.content || '',
            tags: Array.isArray(raw.tags) ? [...raw.tags] : [],
            point: Number(raw.point) || 0,
            userId: raw.userId,
        })
    },
})

const comment = ref(defaultComment)
watch([fetchedComment, commentId], () => {
    if (!commentId.value) {
        comment.value = defaultComment
    } else if (fetchedComment.value) {
        comment.value = fetchedComment.value
    }
}, { immediate: true, flush: 'sync' })

const pending = computed(() => !!commentId.value && fetchedPending.value)

const editOpen = ref(false)
const recordsOpen = ref(false)

// 子评论分页（前端分页，API 一次性获取全部）
const pageSize = 5
const page = ref(1)

// 评论列表数据（自身 + 子评论）
const rootComment = ref(null)
const children = ref([])
const listPending = ref(false)

const totalPages = computed(() => Math.max(1, Math.ceil(children.value.length / pageSize)))
const pagedChildren = computed(() => {
    const start = (page.value - 1) * pageSize
    return children.value.slice(start, start + pageSize)
})

// 新增/删除评论后校正页码
watch([children, totalPages], () => {
    if (page.value > totalPages.value) page.value = totalPages.value
})

async function fetchComments() {
    if (!commentId.value || !editableCourseId.value) return
    listPending.value = true
    try {
        const data = await cRequest(`/api/lms/comments/list?course_id=${editableCourseId.value}&cid=${commentId.value}`)
        if (data) {
            rootComment.value = data.root || null
            children.value = data.children || []
            // 若当前用户已回复过，上报完成状态
            const uid = user.value?.id
            if (uid && Array.isArray(data.children) && data.children.some(c => c.userId === uid)) {
                chapterTask?.reportNodeDone('comment', commentId.value, true)
            }
        }
    } catch {
        rootComment.value = null
        children.value = []
    } finally {
        listPending.value = false
    }
}

// 打开时加载评论列表
watch(commentId, () => {
    if (commentId.value) fetchComments()
}, { immediate: true })

// 点赞/取消点赞
async function toggleLike(item) {
    const newLike = !item.liked
    // 乐观更新：同时更新 liked 和 likeCount
    item.liked = newLike
    item.likeCount = Math.max(0, (item.likeCount || 0) + (newLike ? 1 : -1))
    try {
        await cRequest('/api/lms/comments/like', {
            method: 'POST',
            body: {
                course_id: editableCourseId.value,
                comment_cid: item.cid,
                like: newLike,
            },
        })
        // 防御性通知 userCard 刷新（未来若点赞也会加分，可即时反映）
        useUserCard().refresh()
    } catch {
        // 回滚
        item.liked = !newLike
        item.likeCount = Math.max(0, (item.likeCount || 0) + (newLike ? -1 : 1))
    }
}

// 回复评论
async function onReply({ content, parentCid }) {
    if (!content || !editableCourseId.value) return
    try {
        const result = await cRequest('/api/lms/comments/add', {
            method: 'POST',
            body: {
                course_id: editableCourseId.value,
                content,
                parentId: parentCid,
                name: '',
            },
        })
        // 添加到子评论列表
        if (result) {
            children.value.push({
                ...result,
                liked: false,
            })
            // 跳转到最后一页，让用户看到新回复
            page.value = totalPages.value
            // 上报评论完成（回复即完成）
            chapterTask?.reportNodeDone('comment', commentId.value, true)
        }
        // 防御性通知 userCard 刷新（未来若评论也会加分，可即时反映）
        useUserCard().refresh()
    } catch (err) {
        // 静默
    }
}

// 删除子评论
async function onDelete(item) {
    try {
        await cRequest('/api/lms/comments/delete', {
            method: 'POST',
            body: {
                course_id: editableCourseId.value,
                cid: item.cid,
            },
        })
        // 从列表中移除
        children.value = children.value.filter(c => c.cid !== item.cid)
    } catch (err) {
        // 静默
    }
}

function onSaved(cm) {
    if (cm.cid && Number(cm.cid) !== commentId.value) {
        emit('init', cm.cid)
    } else {
        refresh()
    }
    if (comment.value) {
        Object.assign(comment.value, cm)
    }
}
</script>

<style scoped>
.comment-render {
    width: 100%;
}
</style>
