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
    // judgeYesNo Modal mode（Has modelValue prop）
    const isModal = computed(() => props.modelValue !== undefined)

    // Modal mode open Status
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

    // provide tochild tree（replaceOld setEditableMeta temporarySettings/alsooriginal）
    provideLmsCourseId(effectiveCourseId)

    const saving = ref(false)
    const saveMsg = ref('')
    const saveOk = ref(true)
    const form = ref<any>(null)
    let originalData: any = null

    // from props.homework deep cloneInitialize form
    function initForm() {
        if (!props.homework) {
            form.value = {
                name: '',
                code: '',
                content: '',
                point: 1,
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
                // alreadyHasHomework：Update
                await cRequest('/api/homeworks/update', {
                    method: 'POST',
                    body: { id: props.homeworkId, course_id: effectiveCourseId.value, ...form.value },
                })
                emit('saved', form.value)
            } else {
                // NewHomework：Addandtake back cid
                const result = await cRequest('/api/homeworks/add', {
                    method: 'POST',
                    body: { course_id: effectiveCourseId.value, ...form.value },
                })
                emit('saved', { ...form.value, cid: result.cid })
            }
            saveOk.value = true
            saveMsg.value = t('homework.save success')
            originalData = JSON.parse(JSON.stringify(form.value))
            // Modal mode：CloseModal
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

    // ── JSON originalStartDataEditeditor（Highlevel） ──
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

    // Modal mode：ModalOpenwhenInitialize form
    watch(open, (val) => {
        if (val) initForm()
        else {
            form.value = null
            saveMsg.value = ''
        }
    }, { immediate: true })

    // Insideinline mode：ComponentLoadwhenInitialize form
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
