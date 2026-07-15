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
    // Prefer props.courseId (admin reuse scenario), otherwise use useLmsContext's courseId
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

    // Default homework (filled when homeworkId is empty, for easy creation)
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

    // Use default homework when homeworkId is empty; otherwise use API data
    const homework = ref<any>(defaultHomework)
    watch([fetchedHomework, homeworkId], () => {
        if (!homeworkId.value) {
            homework.value = defaultHomework
        } else if (fetchedHomework.value) {
            homework.value = fetchedHomework.value
        }
    }, { immediate: true, flush: 'sync' })

    // Do not show loading state when homeworkId is empty
    const pending = computed(() => !!homeworkId.value && fetchedPending.value)

    const editOpen = ref(false)
    const recordsOpen = ref(false)

    // Student submission state
    const submittedContent = ref('')
    const submittedFiles = ref<any[]>([])
    const submitted = ref(false)
    const submittedFileList = ref<any[]>([])
    const submitting = ref(false)
    const submitMsg = ref('')
    const submitOk = ref(true)

    // Determine if it's rich text JSON
    function isRichDoc(content: any) {
        return content && typeof content === 'object' && !Array.isArray(content) && !!content.type
    }

    async function onSubmit() {
        // Forbid submission when not logged in
        if (!isLoggedIn.value) {
            toast.add({ title: t('common.loginRequired'), color: 'warning' })
            return
        }
        if (!homeworkId.value || !effectiveCourseId.value) return
        submitting.value = true
        submitMsg.value = ''
        try {
            const files = Array.isArray(submittedFiles.value) ? submittedFiles.value : [submittedFiles.value]
            const result: any = await cRequest('/api/homeworks/submit', {
                method: 'POST',
                body: {
                    course_id: effectiveCourseId.value,
                    chapter_id: chapterId.value,
                    homework_cid: homeworkId.value,
                    files,
                    content: submittedContent.value,
                },
            })
            submitted.value = true
            submittedFileList.value = files
            submitOk.value = true
            submitMsg.value = t('homework.submit success')
            // Post-submit toast hint: success + experience
            const gainedExp = Number(result?.gainedExp) || 0
            toast.add({
                title: t('homework.submit success'),
                description: gainedExp > 0 ? t('homework.submitExpGained', { exp: gainedExp }) : undefined,
                color: 'success',
            })
            // Report homework completion (submitting means completion)
            chapterTask?.reportNodeDone('homework', homeworkId.value, true)
            // Notify userCard to refresh (homework submission increases course experience)
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

    // On mouse hover (only once) fetch current user's submission record and fill into submission state
    async function fetchRecord() {
        if (isTeacher.value) return
        if (!homeworkId.value || !effectiveCourseId.value) return
        try {
            const data = await cRequest(`/api/homeworks/record?course_id=${effectiveCourseId.value}&cid=${homeworkId.value}`)
            if (data) {
                // Fill submitted content
                if (data.content) {
                    submittedContent.value = data.content
                }
                // Fill submitted files
                if (Array.isArray(data.files) && data.files.length > 0) {
                    submittedFiles.value = [...data.files]
                    submittedFileList.value = [...data.files]
                }
                // Mark as submitted if there is content or files
                if (data.content || (Array.isArray(data.files) && data.files.length > 0)) {
                    submitted.value = true
                    // Report historical completion state
                    chapterTask?.reportNodeDone('homework', homeworkId.value, true)
                }
            }
        } catch (err) {
            // Silently ignored (not logged in or no record)
        }
    }

    // Edit save callback: notify parent component (editor will call updateAttributes)
    function onSaved(hw: any) {
        // No longer calls refresh(): refresh triggers pending=true → loading state flicker,
        // causing the edit button to be removed from the DOM; when the modal closes, Radix focus falls back to body, causing the document to scroll to the top.
        // Object.assign has already updated local state with formData immediately, no need to refetch.
        if (homework.value) {
            Object.assign(homework.value, hw)
        }
        // Notify index.vue (editor will call updateAttributes to update content attribute)
        emit('saved', hw)
    }

    const ctx = {
        t, effectiveCourseId, moduleLms, RecordsModal,
        homework, pending, homeworkId, isTeacher,
        editOpen, recordsOpen, refresh,
        submittedContent, submittedFiles, submitted, submittedFileList,
        submitting, submitMsg, submitOk,
        onSubmit, onReset, fetchRecord, onSaved, isRichDoc,
    }
    provide(HomeworkRenderKey, ctx)
    return ctx
}
