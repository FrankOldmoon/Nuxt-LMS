import { ref, computed, provide, inject, watch, type InjectionKey } from 'vue'

export interface QuizEditProps {
    modelValue?: boolean
    quizId?: number
    quiz?: any
    courseId?: number | string
}

export type QuizEditEmit = (event: 'update:modelValue' | 'saved', ...args: any[]) => void

type QuizEditCtx = ReturnType<typeof useQuizEdit>
export const QuizEditKey: InjectionKey<QuizEditCtx> = Symbol('QuizEdit')
export function useQuizEditContext() {
    const ctx = inject(QuizEditKey)
    if (!ctx) throw new Error('useQuizEditContext must be used within quiz/edit.vue')
    return ctx
}

export function useQuizEdit(props: QuizEditProps, emit: QuizEditEmit) {
    const { t } = useI18n()
    const { courseId: ctxCourseId } = useLmsContext()
    const effectiveCourseId = computed(() => {
        if (props.courseId !== undefined && props.courseId !== null && props.courseId !== '') {
            return Number(props.courseId) || 0
        }
        return ctxCourseId.value
    })

    // provide 给子树（替代旧的 setEditableMeta 临时设置/还原）
    provideLmsCourseId(effectiveCourseId)

    const isModal = computed(() => props.modelValue !== undefined)
    const open = computed({
        get: () => props.modelValue,
        set: (v: any) => emit('update:modelValue', v),
    })

    const saving = ref(false)
    const saveMsg = ref('')
    const saveOk = ref(true)
    const form = ref<any>(null)
    const pickerOpen = ref(false)

    const totalPoint = computed(() => {
        if (!form.value?.questions) return 0
        return form.value.questions.reduce((sum: number, q: any) => sum + (Number(q.point) || 0), 0)
    })

    function normalizeQuestions(raw: any) {
        if (!Array.isArray(raw)) return []
        return raw.map((item: any) => {
            if (typeof item === 'number') return { id: item, point: 1 }
            if (item && typeof item === 'object') return { id: Number(item.id), point: Number(item.point) || 1 }
            return { id: 0, point: 1 }
        }).filter((q: any) => q.id > 0)
    }

    function initForm() {
        if (!props.quiz) {
            form.value = {
                name: '',
                timeLimit: 600,
                submitLimit: 1,
                startAt: '',
                endAt: '',
                questions: [],
                content: '',
            }
            return
        }
        const normalized = {
            name: props.quiz.name || '',
            timeLimit: Number(props.quiz.timeLimit) || 600,
            submitLimit: Number(props.quiz.submitLimit) || 1,
            startAt: props.quiz.startAt ? formatDateTime(props.quiz.startAt) : '',
            endAt: props.quiz.endAt ? formatDateTime(props.quiz.endAt) : '',
            questions: normalizeQuestions(props.quiz.questions),
            content: props.quiz.content || '',
        }
        form.value = normalized
    }

    function formatDateTime(d: any) {
        const date = new Date(d)
        const pad = (n: number) => String(n).padStart(2, '0')
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
    }

    function onPickQuestions(cids: number[]) {
        for (const cid of cids) {
            if (!form.value.questions.some((q: any) => q.id === cid)) {
                form.value.questions.push({ id: cid, point: 1 })
            }
        }
    }

    async function saveQuiz() {
        if (!form.value) return
        saving.value = true
        saveMsg.value = ''
        try {
            const payload = { ...form.value }
            if (!payload.startAt) payload.startAt = null
            if (!payload.endAt) payload.endAt = null
            payload.point = totalPoint.value

            if (props.quizId) {
                await cRequest('/api/quizzes/update', {
                    method: 'POST',
                    body: { id: props.quizId, course_id: effectiveCourseId.value, ...payload },
                })
                emit('saved', { ...form.value, cid: props.quizId, point: totalPoint.value })
            } else {
                const result = await cRequest('/api/quizzes/add', {
                    method: 'POST',
                    body: { course_id: effectiveCourseId.value, ...payload },
                })
                emit('saved', { ...form.value, cid: result.cid, point: totalPoint.value })
            }
            saveOk.value = true
            saveMsg.value = t('quiz.saveSuccess')
            if (isModal.value) {
                open.value = false
            }
        } catch (err: any) {
            saveOk.value = false
            saveMsg.value = err.message || t('quiz.saveFailed')
        } finally {
            saving.value = false
        }
    }

    // ── JSON 原始数据编辑器（高级） ──
    const showJsonEditor = ref(false)
    const jsonText = ref('')
    const jsonError = ref('')
    let syncingFromForm = false
    let syncingFromJson = false

    // form.value → jsonText
    watch(form, (newForm) => {
        if (syncingFromJson) return
        if (!newForm) {
            jsonText.value = ''
            jsonError.value = ''
            return
        }
        syncingFromForm = true
        try {
            jsonText.value = JSON.stringify(newForm, null, 2)
            jsonError.value = ''
        } catch (e: any) {
            jsonError.value = e?.message || 'Serialize error'
        } finally {
            syncingFromForm = false
        }
    }, { deep: true, immediate: true })

    // jsonText → form.value
    watch(jsonText, (newText) => {
        if (syncingFromForm) return
        if (!form.value) return
        if (!String(newText || '').trim()) return
        try {
            const parsed = JSON.parse(newText)
            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                jsonError.value = 'JSON must be an object'
                return
            }
            syncingFromJson = true
            for (const key of Object.keys(parsed)) {
                form.value[key] = parsed[key]
            }
            jsonError.value = ''
        } catch (e: any) {
            jsonError.value = e?.message || 'Parse error'
        } finally {
            syncingFromJson = false
        }
    })

    // Modal 模式：弹窗打开时初始化 form
    watch(open, (val) => {
        if (val) initForm()
        else {
            form.value = null
            saveMsg.value = ''
        }
    }, { immediate: true })

    // 内联模式：组件加载时初始化 form
    watch(() => props.quiz, () => {
        if (!isModal.value) initForm()
    }, { immediate: true })

    const ctx = {
        t, isModal, open, form, saving, saveMsg, saveOk,
        showJsonEditor, jsonText, jsonError, pickerOpen,
        totalPoint, onPickQuestions, saveQuiz,
    }
    provide(QuizEditKey, ctx)
    return ctx
}
