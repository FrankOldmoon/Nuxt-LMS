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
    // 尚未设置内容：节点上还没有 cid（新建后从未保存），也没有外部直接传入的 comment（后台预览）
    const isUnset = computed(() => !commentId.value && !props.comment)
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
            if (!raw || typeof raw !== 'object') return null
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
    const pageSize = ref(10)
    const page = ref(1)

    // 评论列表数据（自身 + 子评论）
    const rootComment = ref<any>(null)
    const children = ref<any[]>([])
    const listPending = ref(false)

    const totalPages = computed(() => Math.max(1, Math.ceil(children.value.length / pageSize.value)))
    const pagedChildren = computed(() => {
        const start = (page.value - 1) * pageSize.value
        return children.value.slice(start, start + pageSize.value)
    })

    // 新增/删除评论/修改每页数量后校正页码
    watch([children, totalPages], () => {
        if (page.value > totalPages.value) page.value = totalPages.value
    })

    // 是否已发表过评论（用于评论块的绿色外框，与作业一致）：
    // - 刚回复成功：onReply 已把新回复乐观插入 children，立即为 true
    // - 重新进入：服务端列表里包含自己发的评论（自己发的无论是否过审，作者都可见）
    // - 主题评论本身由自己创建（老师/管理员）也算已发表
    // 注意：这里只是「已参与」的视觉状态（回复即变绿）；章节进度完成另走 hasApprovedReply，
    // 需老师审核通过后才算，二者刻意解耦，勿互相「对齐」。
    const hasPosted = computed(() => {
        const uid = Number(user.value?.id) || 0
        if (!uid) return false
        if (Number(rootComment.value?.userId) === uid) return true
        return children.value.some((c: any) => Number(c.userId) === uid)
    })

    /**
     * 我在本主题下是否已有「过审」的回复。
     * 完成判定以此为准：回复默认 status='audit'（待审核），只有老师审核通过
     * （status='published'）后才计入章节进度。
     */
    function hasApprovedReply(list: any[]) {
        const uid = Number(user.value?.id) || 0
        if (!uid) return false
        return (Array.isArray(list) ? list : []).some(
            (c: any) => Number(c.userId) === uid && c.status === 'published'
        )
    }

    /**
     * 拉取评论列表。
     * @param opts.silent 静默刷新：不置 listPending（模板里的 loading 占位会整块替换列表/表单，
     *                    是界面跳动的来源），并复用已有的子评论对象引用，避免卡片组件重建。
     */
    async function fetchComments(opts: { silent?: boolean } = {}) {
        if (!commentId.value || !effectiveCourseId.value) return
        const silent = !!opts.silent
        if (!silent) listPending.value = true
        try {
            const data = await cRequest(`/api/comments/list?course_id=${effectiveCourseId.value}&cid=${commentId.value}`)
            if (data) {
                rootComment.value = data.root || null
                const next = Array.isArray(data.children) ? data.children : []
                if (silent) {
                    // 按 cid 复用旧对象：保持组件实例与 DOM 不变，只有变化的字段触发局部更新
                    const prev = new Map(children.value.map((c: any) => [Number(c.cid), c]))
                    children.value = next.map((c: any) => {
                        const old = prev.get(Number(c.cid))
                        return old ? Object.assign(old, c) : c
                    })
                } else {
                    children.value = next
                }
                // 已有过审回复才上报完成（老师审核通过后经 WS commentRefresh 广播触发到这里补上）
                if (hasApprovedReply(children.value)) {
                    chapterTask?.reportNodeDone('comment', commentId.value, true)
                }
            }
        } catch {
            // 静默刷新失败不销毁已有数据，避免界面闪空
            if (!silent) {
                rootComment.value = null
                children.value = []
            }
        } finally {
            if (!silent) listPending.value = false
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
                // 上报评论完成：仅当已存在过审回复（回复默认待审核，需老师 approve 后才计入进度）
                if (hasApprovedReply(children.value)) {
                    chapterTask?.reportNodeDone('comment', commentId.value, true)
                }
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
    // 注意：只做「就地改状态」，绝不重拉列表/整块刷新 —— 否则评论卡片与回复表单会被
    // 重建，列表高度变化导致界面跳动（尤其是正在输入回复时内容丢失）。
    async function onApprove(item: any) {
        // 顶部按钮传入的是 /api/comments/show 的 transform 结果（只含 name/content/tags/point/status），
        // 没有 cid，用当前节点的 commentId 兜底；子评论卡片传入的 item 自带 cid。
        const cid = Number(item?.cid) || commentId.value
        if (!cid) return
        try {
            await cRequest('/api/comments/approve', {
                method: 'POST',
                body: {
                    course_id: effectiveCourseId.value,
                    cid,
                },
            })
            noteSelfApproved(cid)
            markApprovedLocal(cid)
            toast.add({ title: t('comment.approveSuccess'), color: 'success' })
        } catch (err: any) {
            toast.add({ title: t('comment.approveFailed'), description: err?.message, color: 'error' })
        }
    }

    /**
     * 审核通过后的就地更新：把某个 cid 的 status 改成 published，
     * 根评论 / 主题评论内容 / 子评论列表三处都找一遍，命中即更新，不触发任何重新请求。
     * @returns 是否命中（false 表示这个 cid 不在当前视图里，需要另行刷新才能看到）
     */
    function markApprovedLocal(cid: number) {
        const cidNum = Number(cid) || 0
        if (!cidNum) return false
        let hit = false
        if (comment.value && cidNum === commentId.value) {
            Object.assign(comment.value, { status: 'published' })
            hit = true
        }
        if (Number(rootComment.value?.cid) === cidNum) {
            Object.assign(rootComment.value, { status: 'published' })
            hit = true
        }
        const child = children.value.find((c: any) => Number(c.cid) === cidNum)
        if (child) {
            Object.assign(child, { status: 'published' })
            hit = true
        }
        if (hit && hasApprovedReply(children.value)) {
            chapterTask?.reportNodeDone('comment', commentId.value, true)
        }
        return hit
    }

    // 自己刚审核通过的 cid：本地已经就地更新过，WS 广播回来时直接忽略，
    // 避免「自己点审核 → 自己收到广播 → 再刷新一次」的无谓重排。
    const selfApprovedCids = new Set<number>()
    function noteSelfApproved(cid: number) {
        const cidNum = Number(cid) || 0
        if (!cidNum) return
        selfApprovedCids.add(cidNum)
        // 广播是 fire-and-forget，可能晚到；20s 后兜底清理，防止集合无限增长
        setTimeout(() => selfApprovedCids.delete(cidNum), 20000)
    }
    function consumeSelfApproved(cid: number) {
        const cidNum = Number(cid) || 0
        if (!cidNum || !selfApprovedCids.has(cidNum)) return false
        selfApprovedCids.delete(cidNum)
        return true
    }

    const ctx = {
        effectiveCourseId, moduleLms, RecordsModal,
        comment, commentId, isUnset, isTeacher, user,
        editOpen, recordsOpen, pending, listPending,
        page, pageSize, totalPages, children, pagedChildren, hasPosted,
        fetchComments,
        onReply, toggleLike, onDelete, onApprove, onSaved,
        markApprovedLocal, noteSelfApproved, consumeSelfApproved,
    }
    provide(CommentRenderKey, ctx)
    return ctx
}
