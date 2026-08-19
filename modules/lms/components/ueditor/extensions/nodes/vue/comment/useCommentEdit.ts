import { ref, computed, provide, inject, watch, type InjectionKey } from 'vue'

export interface CommentEditProps {
    modelValue?: boolean
    commentId?: number
    comment?: any
}

export type CommentEditEmit = (event: 'update:modelValue' | 'saved', ...args: any[]) => void

type CommentEditCtx = ReturnType<typeof useCommentEdit>
export const CommentEditKey: InjectionKey<CommentEditCtx> = Symbol('CommentEdit')
export function useCommentEditContext() {
    const ctx = inject(CommentEditKey)
    if (!ctx) throw new Error('useCommentEditContext must be used within Comment edit.vue')
    return ctx
}

export function useCommentEdit(props: CommentEditProps, emit: CommentEditEmit) {
    // 判断是否为 Modal 模式（有 modelValue prop）
    const isModal = computed(() => props.modelValue !== undefined)

    // Modal 模式的 open 状态
    const open = computed({
        get: () => props.modelValue,
        set: (v: any) => emit('update:modelValue', v),
    })

    const { t } = useI18n()
    const { courseId: effectiveCourseId, chapterId } = useLmsContext()
    const toast = useToast()

    const saving = ref(false)
    const saveMsg = ref('')
    const saveOk = ref(true)
    const form = ref<any>(null)
    let originalData: any = null

    function initForm() {
        if (!props.comment) {
            form.value = {
                name: '',
                content: '',
                tags: [],
                point: 1,
            }
            originalData = JSON.parse(JSON.stringify(form.value))
            return
        }
        const normalized = {
            name: props.comment.name || '',
            content: props.comment.content || '',
            tags: Array.isArray(props.comment.tags) ? [...props.comment.tags] : [],
            point: Number(props.comment.point) || 0,
        }
        form.value = normalized
        originalData = JSON.parse(JSON.stringify(normalized))
    }

    function resetForm() {
        if (originalData) form.value = JSON.parse(JSON.stringify(originalData))
        saveMsg.value = ''
    }

    async function save() {
        if (!form.value) return
        saving.value = true
        saveMsg.value = ''
        try {
            if (props.commentId) {
                await cRequest('/api/comments/update', {
                    method: 'POST',
                    body: { id: props.commentId, course_id: effectiveCourseId.value, ...form.value },
                })
                emit('saved', form.value)
                // 编辑评论：toast 成功（不广播 danmaku，由后端 update 接口按需决定）
                toast.add({ title: t('comment.saveSuccess'), color: 'success' })
            } else {
                const result = await cRequest('/api/comments/add', {
                    method: 'POST',
                    body: { course_id: effectiveCourseId.value, chapter_id: Number(chapterId?.value) || 0, ...form.value },
                })
                emit('saved', { ...form.value, cid: result.cid })
                // 新增评论：toast 成功
                toast.add({ title: t('comment.saveSuccess'), color: 'success' })
            }
            saveOk.value = true
            saveMsg.value = t('comment.saveSuccess')
            originalData = JSON.parse(JSON.stringify(form.value))
            // Modal 模式：关闭弹窗
            if (isModal.value) {
                open.value = false
            }
        } catch (err: any) {
            saveOk.value = false
            saveMsg.value = err.message || t('comment.saveFailed')
            toast.add({
                title: t('comment.saveFailed'),
                description: err?.message,
                color: 'error',
            })
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
    watch(() => props.comment, () => {
        if (!isModal.value) initForm()
    }, { immediate: true })

    const ctx = {
        t, isModal, open, form,
        saving, saveMsg, saveOk,
        showJsonEditor, jsonText, jsonError,
        resetForm, save,
    }
    provide(CommentEditKey, ctx)
    return ctx
}
