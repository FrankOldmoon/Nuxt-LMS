import { ref, computed, provide, inject, watch, type InjectionKey } from 'vue'

export interface CommentRenderProps {
    node?: any
    comment?: any
    courseId?: number | string
}

type CommentRenderCtx = ReturnType<typeof useCommentRender>
export const CommentRenderKey: InjectionKey<CommentRenderCtx> = Symbol('CommentRender')
export function useCommentRenderContext() {
    const ctx = inject(CommentRenderKey)
    if (!ctx) throw new Error('useCommentRenderContext must be used within Comment render.vue')
    return ctx
}

export function useCommentRender(props: CommentRenderProps) {
    const { courseId: ctxCourseId, chapterId } = useLmsContext()
    const effectiveCourseId = computed(() => {
        if (props.courseId !== undefined && props.courseId !== null && props.courseId !== '') {
            return Number(props.courseId) || 0
        }
        return ctxCourseId.value
    })
    const { user, hasRole } = useAuth()
    const { t } = useI18n()
    const isLoggedIn = computed(() => !!user.value)
    const toast = useToast()
    const { moduleLms } = useRuntimeConfig().public
    const RecordsModal = null
    const chapterTask = useChapterTask()

    const commentId = computed(() => Number(props.node?.attrs?.content) || 0)
    const isTeacher = computed(() => hasRole('teacher') || hasRole('admin'))

    const editOpen = ref(false)
    const recordsOpen = ref(false)

    // SSR-friendly data fetching（如果 props.comment 不存在，从 API 获取）
    const apiUrl = computed(() => {
        if (!commentId.value || !effectiveCourseId.value) return ''
        return `/api/comments/show?course_id=${effectiveCourseId.value}&cid=${commentId.value}`
    })

    const { data: fetchedComment, pending: fetchedPending, refresh } = cRequest.use(apiUrl, {
        transform: (raw: any) => {
            if (!raw) return null
            return {
                name: raw.name || '',
                content: raw.content || '',
                tags: Array.isArray(raw.tags) ? [...raw.tags] : [],
                point: Number(raw.point) || 0,
                status: raw.status || null,
            }
        },
    })

    // comment ref：优先使用 props.comment，否则使用 API 数据
    const comment = ref<any>(null)
    watch([() => props.comment, fetchedComment], () => {
        if (props.comment) {
            comment.value = props.comment
        } else if (fetchedComment.value) {
            comment.value = fetchedComment.value
        } else {
            comment.value = null
        }
    }, { immediate: true })

    // 加载状态（仅用于 API 获取）
    const pending = computed(() => !props.comment && !!commentId.value && fetchedPending.value)

    function onSaved(updatedComment: any) {
        // 新建评论：拿到新增 cid 后通知父节点更新 content 属性
        if (updatedComment.cid && Number(updatedComment.cid) !== commentId.value) {
            // 这里需要 emit 给父节点（如果需要）
        } else {
            // 已有评论：刷新接口数据
            refresh()
        }
        // 本地立即更新内容，避免刷新期间空白
        if (comment.value) {
            Object.assign(comment.value, updatedComment)
        }
    }

    // 子评论分页（前端分页，API 一次性获取全部）
    const pageSize = 10
    const page = ref(1)

    // 评论列表数据（自身 + 子评论）
    const rootComment = ref<any>(null)
    const children = ref<any[]>([])
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
        if (!commentId.value || !effectiveCourseId.value) return
        listPending.value = true
        try {
            const data = await cRequest(`/api/comments/list?course_id=${effectiveCourseId.value}&cid=${commentId.value}`)
            if (data) {
                rootComment.value = data.root || null
                children.value = data.children || []
                // 若当前用户已回复过，上报完成状态
                const uid = user.value?.id
                if (uid && Array.isArray(data.children) && data.children.some((c: any) => c.userId === uid)) {
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
    async function toggleLike(item: any) {
        const newLike = !item.liked
        // 乐观更新：同时更新 liked 和 likeCount
        item.liked = newLike
        item.likeCount = Math.max(0, (item.likeCount || 0) + (newLike ? 1 : -1))
        try {
            await cRequest('/api/comments/like', {
                method: 'POST',
                body: {
                    course_id: effectiveCourseId.value,
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
    async function onReply({ content, parentCid }: { content: any, parentCid: number }) {
        // 未登录时禁止提交
        if (!isLoggedIn.value) {
            toast.add({ title: t('common.loginRequired'), color: 'warning' })
            return
        }
        if (!content || !effectiveCourseId.value) return
        try {
            const result = await cRequest('/api/comments/add', {
                method: 'POST',
                body: {
                    course_id: effectiveCourseId.value,
                    chapter_id: Number(chapterId?.value) || 0,
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
                    status: result.status || 'audit',
                })
                // 跳转到最后一页，让用户看到新回复
                page.value = totalPages.value
                // 上报评论完成（回复即完成）
                chapterTask?.reportNodeDone('comment', commentId.value, true)
                // 回复成功 toast
                toast.add({ title: t('comment.replySuccess'), color: 'success' })
            }
            // 防御性通知 userCard 刷新（未来若评论也会加分，可即时反映）
            useUserCard().refresh()
        } catch (err: any) {
            toast.add({
                title: t('comment.replyFailed'),
                description: err?.message,
                color: 'error',
            })
        }
    }

    // 删除子评论
    async function onDelete(item: any) {
        try {
            await cRequest('/api/comments/delete', {
                method: 'POST',
                body: {
                    course_id: effectiveCourseId.value,
                    cid: item.cid,
                },
            })
            // 从列表中移除
            children.value = children.value.filter((c: any) => c.cid !== item.cid)
        } catch (err) {
            // 静默
        }
    }

    // 审核通过（老师/管理员）：把待审核评论置为 published，随后对普通用户可见
    async function onApprove(item: any) {
        if (!item?.cid) return
        try {
            await cRequest('/api/comments/approve', {
                method: 'POST',
                body: {
                    course_id: effectiveCourseId.value,
                    cid: item.cid,
                },
            })
            item.status = 'published'
            toast.add({ title: t('comment.approveSuccess'), color: 'success' })
        } catch (err: any) {
            toast.add({ title: t('comment.approveFailed'), description: err?.message, color: 'error' })
        }
    }

    const ctx = {
        effectiveCourseId, moduleLms, RecordsModal,
        comment, commentId, isTeacher, user,
        editOpen, recordsOpen, pending, listPending,
        page, pageSize, totalPages, children, pagedChildren,
        fetchComments,
        onReply, toggleLike, onDelete, onApprove, onSaved,
    }
    provide(CommentRenderKey, ctx)
    return ctx
}
