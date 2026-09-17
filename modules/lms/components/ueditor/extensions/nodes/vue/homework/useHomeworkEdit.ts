import { ref, computed, provide, inject, watch, type InjectionKey } from 'vue'

export interface HomeworkEditProps {
    modelValue?: boolean
    homeworkId?: number
    homework?: any
    courseId?: number | string
}

export type HomeworkEditEmit = (event: 'update:modelValue' | 'saved', ...args: any[]) => void

type HomeworkEditCtx = ReturnType<typeof useHomeworkEdit>
export const HomeworkEditKey: InjectionKey<HomeworkEditCtx> = Symbol('HomeworkEdit')
export function useHomeworkEditContext() {
    const ctx = inject(HomeworkEditKey)
    if (!ctx) throw new Error('useHomeworkEditContext must be used within Homework edit.vue')
    return ctx
}

export function useHomeworkEdit(props: HomeworkEditProps, emit: HomeworkEditEmit) {
    // 判断是否为 Modal 模式（有 modelValue prop）
    const isModal = computed(() => props.modelValue !== undefined)

    // Modal 模式的 open 状态
    const open = computed({
        get: () => props.modelValue,
        set: (v: any) => emit('update:modelValue', v),
    })

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

    const saving = ref(false)
    const saveMsg = ref('')
    const saveOk = ref(true)
    const form = ref<any>(null)
    let originalData: any = null

    // 从 props.homework 深拷贝初始化 form
    function initForm() {
        if (!props.homework) {
            form.value = {
                name: '',
                code: '',
                content: '',
                point: 10,
                tags: [],
                explanation: '',
            }
            originalData = JSON.parse(JSON.stringify(form.value))
            return
        }
        const normalized = {
            name: props.homework.name || '',
            code: props.homework.code || '',
            content: props.homework.content || '',
            point: Number(props.homework.point) || 0,
            tags: Array.isArray(props.homework.tags) ? [...props.homework.tags] : [],
            explanation: props.homework.explanation || '',
        }
        form.value = normalized
        originalData = JSON.parse(JSON.stringify(normalized))
    }

    function resetForm() {
        if (originalData) form.value = JSON.parse(JSON.stringify(originalData))
        saveMsg.value = ''
    }

    async function saveHomework() {
        if (!form.value) return
        saving.value = true
        saveMsg.value = ''
        try {
            if (props.homeworkId) {
                // 已有作业：更新
                await cRequest('/api/homeworks/update', {
                    method: 'POST',
                    body: { id: props.homeworkId, course_id: effectiveCourseId.value, ...form.value },
                })
                emit('saved', form.value)
            } else {
                // 新作业：新增并拿回 cid
                const result = await cRequest('/api/homeworks/add', {
                    method: 'POST',
                    body: { course_id: effectiveCourseId.value, ...form.value },
                })
                emit('saved', { ...form.value, cid: result.cid })
            }
            saveOk.value = true
            saveMsg.value = t('homework.saveSuccess')
            originalData = JSON.parse(JSON.stringify(form.value))
            // Modal 模式：关闭弹窗
            if (isModal.value) {
                open.value = false
            }
        } catch (err: any) {
            saveOk.value = false
            saveMsg.value = err.message || t('homework.saveFailed')
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
    watch(() => props.homework, () => {
        if (!isModal.value) initForm()
    }, { immediate: true })

    const ctx = {
        t, isModal, open, form,
        saving, saveMsg, saveOk,
        showJsonEditor, jsonText, jsonError,
        resetForm, saveHomework,
    }
    provide(HomeworkEditKey, ctx)
    return ctx
}
