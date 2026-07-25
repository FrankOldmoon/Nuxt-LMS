import { ref, computed, watch, provide, inject, type InjectionKey } from 'vue'

export interface RaceEditProps {
    modelValue?: boolean
    raceId: number
    race: any
    courseId?: number | string
}

export type RaceEditEmit = (event: 'update:modelValue' | 'saved', ...args: any[]) => void

type RaceEditCtx = ReturnType<typeof useRaceEdit>
export const RaceEditKey: InjectionKey<RaceEditCtx> = Symbol('RaceEdit')
export function useRaceEditContext() {
    const ctx = inject(RaceEditKey)
    if (!ctx) throw new Error('useRaceEditContext must be used within race/edit.vue')
    return ctx
}

export function useRaceEdit(props: RaceEditProps, emit: RaceEditEmit) {
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

    // 判断是否为 Modal 模式（有 modelValue prop）
    const isModal = computed(() => props.modelValue !== undefined)

    // Modal 模式的 open 状态
    const open = computed({
        get: () => props.modelValue,
        set: (v: boolean) => emit('update:modelValue', v),
    })

    const saving = ref(false)
    const saveMsg = ref('')
    const saveOk = ref(true)
    const form = ref<any>(null)
    const pickerOpen = ref(false)
    let originalData: any = null

    function initForm() {
        if (!props.race) {
            form.value = {
                name: '',
                point: 100,
                gapTime: 30,
                questionIds: [],
            }
            originalData = JSON.parse(JSON.stringify(form.value))
            return
        }
        const raw = Array.isArray(props.race.questionIds) ? props.race.questionIds : []
        const normalized = {
            name: props.race.name || '',
            point: Number(props.race.point) || 100,
            gapTime: Number(props.race.gapTime) || 30,
            questionIds: raw.map((item: any) => typeof item === 'number' ? { id: item } : { id: Number(item.id) }).filter((q: any) => q.id > 0),
        }
        form.value = normalized
        originalData = JSON.parse(JSON.stringify(normalized))
    }

    function onPickQuestions(cids: number[]) {
        for (const cid of cids) {
            if (!form.value.questionIds.some((q: any) => q.id === cid)) {
                form.value.questionIds.push({ id: cid })
            }
        }
    }

    function resetForm() {
        if (originalData) form.value = JSON.parse(JSON.stringify(originalData))
        saveMsg.value = ''
    }

    async function saveRace() {
        if (!form.value) return
        saving.value = true
        saveMsg.value = ''
        try {
            if (props.raceId) {
                // 已有竞赛：更新
                await cRequest('/api/races/update', {
                    method: 'POST',
                    body: { id: props.raceId, course_id: effectiveCourseId.value, ...form.value },
                })
                emit('saved', { ...form.value, cid: props.raceId })
            } else {
                // 新竞赛：新增并拿回 cid
                const result = await cRequest('/api/races/add', {
                    method: 'POST',
                    body: { course_id: effectiveCourseId.value, ...form.value },
                })
                emit('saved', { ...form.value, cid: result.cid })
            }
            saveOk.value = true
            saveMsg.value = t('race.saveSuccess')
            originalData = JSON.parse(JSON.stringify(form.value))
            // Modal 模式：关闭弹窗
            if (isModal.value) {
                open.value = false
            }
        } catch (err: any) {
            saveOk.value = false
            saveMsg.value = err.message || t('race.saveFailed')
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
    watch(() => props.race, () => {
        if (!isModal.value) initForm()
    }, { immediate: true })

    const ctx = {
        t, isModal, open, saving, saveMsg, saveOk, form, pickerOpen,
        showJsonEditor, jsonText, jsonError,
        onPickQuestions, resetForm, saveRace,
    }
    provide(RaceEditKey, ctx)
    return ctx
}
