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
    const { courseId: ctxCourseId } = useLmsContext()
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

    // SSR-friendly data fetching (if props.comment does not exist, fetch from API)
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
            }
        },
    })

    // comment ref: prefer props.comment, otherwise use API data
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

    // Loading state (only for API fetching)
    const pending = computed(() => !props.comment && !!commentId.value && fetchedPending.value)

    function onSaved(updatedComment: any) {
        // New comment: notify parent node to update content attribute after getting new cid
        if (updatedComment.cid && Number(updatedComment.cid) !== commentId.value) {
            // Need to emit to parent node here (if needed)
        } else {
            // Existing comment: refresh API data
            refresh()
        }
        // Update content locally immediately to avoid blank during refresh
        if (comment.value) {
            Object.assign(comment.value, updatedComment)
        }
    }

    // Sub-comment pagination (frontend pagination, API fetches all at once)
    const pageSize = 5
    const page = ref(1)

    // Comment list data (self + sub-comments)
    const rootComment = ref<any>(null)
    const children = ref<any[]>([])
    const listPending = ref(false)

    const totalPages = computed(() => Math.max(1, Math.ceil(children.value.length / pageSize)))
    const pagedChildren = computed(() => {
        const start = (page.value - 1) * pageSize
        return children.value.slice(start, start + pageSize)
    })

    // Correct page number after adding/deleting comments
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
                // If current user has replied, report completion state
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

    // Load comment list on open
    watch(commentId, () => {
        if (commentId.value) fetchComments()
    }, { immediate: true })

    // Like/unlike
    async function toggleLike(item: any) {
        const newLike = !item.liked
        // Optimistic update: update both liked and likeCount
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
            // Defensively notify userCard to refresh (if liking also grants points in the future, it can be reflected immediately)
            useUserCard().refresh()
        } catch {
            // Rollback
            item.liked = !newLike
            item.likeCount = Math.max(0, (item.likeCount || 0) + (newLike ? -1 : 1))
        }
    }

    // Reply to comment
    async function onReply({ content, parentCid }: { content: any, parentCid: number }) {
        // Forbid submission when not logged in
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
                    content,
                    parentId: parentCid,
                    name: '',
                },
            })
            // Add to sub-comment list
            if (result) {
                children.value.push({
                    ...result,
                    liked: false,
                })
                // Jump to the last page so the user can see the new reply
                page.value = totalPages.value
                // Report comment completion (replying means completion)
                chapterTask?.reportNodeDone('comment', commentId.value, true)
                // Reply success toast
                toast.add({ title: t('comment.replySuccess'), color: 'success' })
            }
            // Defensively notify userCard to refresh (if commenting also grants points in the future, it can be reflected immediately)
            useUserCard().refresh()
        } catch (err: any) {
            toast.add({
                title: t('comment.replyFailed'),
                description: err?.message,
                color: 'error',
            })
        }
    }

    // Delete sub-comment
    async function onDelete(item: any) {
        try {
            await cRequest('/api/comments/delete', {
                method: 'POST',
                body: {
                    course_id: effectiveCourseId.value,
                    cid: item.cid,
                },
            })
            // Remove from list
            children.value = children.value.filter((c: any) => c.cid !== item.cid)
        } catch (err) {
            // Silent
        }
    }

    const ctx = {
        effectiveCourseId, moduleLms, RecordsModal,
        comment, commentId, isTeacher, user,
        editOpen, recordsOpen, pending, listPending,
        page, pageSize, totalPages, children, pagedChildren,
        onReply, toggleLike, onDelete, onSaved,
    }
    provide(CommentRenderKey, ctx)
    return ctx
}
