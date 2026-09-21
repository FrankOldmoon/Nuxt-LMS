import { reactive, ref, computed, provide, inject, watch, type InjectionKey } from 'vue'

export interface HomeworkRenderProps {
    node?: any
    courseId?: number | string
}

export type HomeworkRenderEmit = (event: 'saved', ...args: any[]) => void

type HomeworkRenderCtx = ReturnType<typeof useHomeworkRender>
export const HomeworkRenderKey: InjectionKey<HomeworkRenderCtx> = Symbol('HomeworkRender')
export function useHomeworkRenderContext() {
    const ctx = inject(HomeworkRenderKey)
    if (!ctx) throw new Error('useHomeworkRenderContext must be used within Homework render.vue')
    return ctx
}

export function useHomeworkRender(props: HomeworkRenderProps, emit: HomeworkRenderEmit) {
    const { t } = useI18n()
    const { courseId, chapterId } = useLmsContext()
    // 优先使用 props.courseId（admin 复用场景），否则用 useLmsContext 的 courseId
    const effectiveCourseId = computed(() => {
        if (props.courseId !== undefined && props.courseId !== null && props.courseId !== '') {
            return Number(props.courseId) || 0
        }
        return courseId.value
    })
    const { user, hasRole } = useAuth()
    const isLoggedIn = computed(() => !!user.value)
    const toast = useToast()
    const { moduleLms } = useRuntimeConfig().public
    const RecordsModal =  null
    const chapterTask = useChapterTask()

    const homeworkId = computed(() => Number(props.node?.attrs?.content) || 0)
    const isTeacher = computed(() => hasRole('teacher') || hasRole('admin'))

    // 默认作业（homeworkId 为空时填充，便于新建）
    const defaultHomework = reactive({
        name: '',
        code: '',
        content: '',
        point: 10,
        tags: [],
        explanation: '',
    })

    // SSR-friendly data fetching
    const apiUrl = computed(() => {
        if (!homeworkId.value || !effectiveCourseId.value) return ''
        return `/api/homeworks/show?course_id=${effectiveCourseId.value}&cid=${homeworkId.value}`
    })

    const { data: fetchedHomework, pending: fetchedPending, refresh } = cRequest.use(apiUrl, {
        transform: (raw: any) => {
            if (!raw) return null
            return reactive({
                name: raw.name || '',
                code: raw.code || '',
                content: raw.content || '',
                point: Number(raw.point) || 0,
                tags: Array.isArray(raw.tags) ? [...raw.tags] : [],
                explanation: raw.explanation || '',
            })
        },
    })

    // homeworkId 为空时使用默认作业；否则使用接口数据
    const homework = ref<any>(defaultHomework)
    watch([fetchedHomework, homeworkId], () => {
        if (!homeworkId.value) {
            homework.value = defaultHomework
        } else if (fetchedHomework.value) {
            homework.value = fetchedHomework.value
        }
    }, { immediate: true, flush: 'sync' })

    // homeworkId 为空时不显示加载态
    const pending = computed(() => !!homeworkId.value && fetchedPending.value)

    const editOpen = ref(false)
    const recordsOpen = ref(false)

    // 学生提交状态
    const submittedContent = ref('')
    const submittedFiles = ref<any[]>([])
    const submitted = ref(false)
    const submittedFileList = ref<any[]>([])
    const submitting = ref(false)
    const submitMsg = ref('')
    const submitOk = ref(true)
    // 提交后 3 秒禁用提交按钮（防止连点/重复提交）
    const submitLocked = ref(false)
    let submitLockTimer: ReturnType<typeof setTimeout> | null = null
    function lockSubmit() {
        submitLocked.value = true
        if (submitLockTimer) clearTimeout(submitLockTimer)
        submitLockTimer = setTimeout(() => { submitLocked.value = false }, 3000)
    }

    // 判断是否为富文本 JSON
    function isRichDoc(content: any) {
        return content && typeof content === 'object' && !Array.isArray(content) && !!content.type
    }

    // 学生的得分 / 评语（提交记录）
    const selfScore = ref<number | null>(null)
    const selfComment = ref('')

    // 优秀作业列表（本班被标优的作业，全班可见）
    const featuredList = ref<any[]>([])
    const featuredPending = ref(false)

    // comment 兼容字符串与 jsonb 对象
    function strFromComment(comment: any): string {
        if (comment == null) return ''
        if (typeof comment === 'string') return comment
        if (typeof comment === 'object') return comment.text || ''
        return ''
    }

    async function fetchFeatured() {
        if (!homeworkId.value || !effectiveCourseId.value) return
        featuredPending.value = true
        try {
            const data = await cRequest(`/api/homeworks/featured?course_id=${effectiveCourseId.value}&homework_cid=${homeworkId.value}`)
            featuredList.value = data || []
        } catch {
            featuredList.value = []
        } finally {
            featuredPending.value = false
        }
    }

    async function onSubmit() {
        // 未登录时禁止提交
        if (!isLoggedIn.value) {
            toast.add({ title: t('common.loginRequired'), color: 'warning' })
            return
        }
        if (!homeworkId.value || !effectiveCourseId.value) return
        submitting.value = true
        submitMsg.value = ''
        try {
            const files = Array.isArray(submittedFiles.value) ? submittedFiles.value : [submittedFiles.value]
            const parentCourseId = useEmbeddingParentCourse()
            const result: any = await cRequest('/api/homeworks/submit', {
                method: 'POST',
                body: {
                    course_id: effectiveCourseId.value,
                    chapter_id: chapterId.value,
                    homework_cid: homeworkId.value,
                    files,
                    content: submittedContent.value,
                    ...(parentCourseId ? { parent_course_id: parentCourseId } : {}),
                },
            })
            submitted.value = true
            submittedFileList.value = files
            submitOk.value = true
            submitMsg.value = t('homework.submitSuccess')
            // 提交后 3 秒禁用提交按钮
            lockSubmit()
            // 提交后 toast 提示：成功 + 经验
            const gainedExp = Number(result?.gainedExp) || 0
            toast.add({
                title: t('homework.submitSuccess'),
                description: gainedExp > 0 ? t('homework.submitExpGained', { exp: gainedExp }) : undefined,
                color: 'success',
            })
            // 上报作业完成（提交即完成）
            chapterTask?.reportNodeDone('homework', homeworkId.value, true)
            // 通知 userCard 刷新（作业提交会增加课程经验）
            useUserCard().refresh()
        } catch (err: any) {
            submitOk.value = false
            submitMsg.value = err.message || t('homework.submitFailed')
            toast.add({
                title: t('homework.submitFailed'),
                description: err.message,
                color: 'error',
            })
        } finally {
            submitting.value = false
        }
    }

    function onReset() {
        submittedContent.value = ''
        submittedFiles.value = []
        submitted.value = false
        submittedFileList.value = []
        submitMsg.value = ''
    }

    // 鼠标移入时（仅一次）获取当前用户的提交记录，填充到提交状态
    async function fetchRecord() {
        if (!isLoggedIn.value || !homeworkId.value || !effectiveCourseId.value) return
        try {
            const data = await cRequest(`/api/homeworks/record?course_id=${effectiveCourseId.value}&cid=${homeworkId.value}`)
            if (data) {
                // 填充已提交内容
                if (data.content) {
                    submittedContent.value = data.content
                }
                // 填充已提交文件
                if (Array.isArray(data.files) && data.files.length > 0) {
                    submittedFiles.value = [...data.files]
                    submittedFileList.value = [...data.files]
                }
                // 得分 / 评语
                if (data.score != null) selfScore.value = Number(data.score)
                if (data.comment) selfComment.value = strFromComment(data.comment)
                // 有内容或文件则标记为已提交
                if (data.content || (Array.isArray(data.files) && data.files.length > 0)) {
                    submitted.value = true
                    // 上报历史完成状态
                    chapterTask?.reportNodeDone('homework', homeworkId.value, true)
                }
            }
        } catch (err) {
            // 静默忽略（未登录或无记录）
        }
    }

    // 编辑保存回调：通知父组件（编辑器中会调用 updateAttributes）
    function onSaved(hw: any) {
        // 不再调用 refresh()：refresh 会触发 pending=true → loading 态闪烁，
        // 导致编辑按钮从 DOM 移除，modal 关闭时 Radix focus 回退到 body 造成文档滚动到顶部。
        // Object.assign 已用表单数据即时更新本地状态，无需重新拉取。
        if (homework.value) {
            Object.assign(homework.value, hw)
        }
        // 通知 index.vue（编辑器中会调用 updateAttributes 更新 content 属性）
        emit('saved', hw)
    }

    const ctx = {
        t, effectiveCourseId, moduleLms, RecordsModal,
        homework, pending, homeworkId, isTeacher, isLoggedIn,
        editOpen, recordsOpen, refresh,
        submittedContent, submittedFiles, submitted, submittedFileList,
        submitting, submitLocked, submitMsg, submitOk,
        selfScore, selfComment, featuredList, featuredPending,
        fetchFeatured, strFromComment,
        onSubmit, onReset, fetchRecord, onSaved, isRichDoc,
    }
    provide(HomeworkRenderKey, ctx)
    return ctx
}
