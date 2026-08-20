import { ref, computed } from 'vue'

export interface EditProps {
    cid: number
    courseId?: number | string
}

export type EditEmit = (event: 'saved', ...args: any[]) => void

/** 评价项行 */
export interface OptionRow {
    key: string
    label: string
    maxScore: number
}

export function usePeerReviewEdit(props: EditProps, emit: EditEmit) {
    const { t } = useI18n()
    const { courseId: ctxCourseId } = useLmsContext()
    const effectiveCourseId = computed(() => {
        if (props.courseId !== undefined && props.courseId !== null && props.courseId !== '') {
            return Number(props.courseId) || 0
        }
        return ctxCourseId.value
    })

    const saving = ref(false)
    const saveMsg = ref('')
    const saveOk = ref(true)
    const loading = ref(false)
    const form = ref<{ name: string; options: OptionRow[] }>({
        name: '',
        options: [],
    })

    /** 生成唯一 key */
    function newKey() {
        return `item_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)}`
    }

    function addOption() {
        form.value.options.push({ key: newKey(), label: '', maxScore: 10 })
    }

    function removeOption(index: number) {
        form.value.options.splice(index, 1)
    }

    /** 加载已有活动配置（编辑模式） */
    async function loadConfig() {
        if (!props.cid || !effectiveCourseId.value) return
        loading.value = true
        try {
            const data = await cRequest(`/api/peer-reviews/show?course_id=${effectiveCourseId.value}&cid=${props.cid}`)
            const config = data?.config
            if (config) {
                form.value = {
                    name: config.name || '',
                    options: (config.options || []).map((o: any) => ({
                        key: o.key,
                        label: o.label,
                        maxScore: Number(o.maxScore) || 10,
                    })),
                }
            }
        } catch {
            // 拉取失败保持空表单
        } finally {
            loading.value = false
        }
    }

    function resetForm() {
        form.value = { name: '', options: [] }
        addOption()
        loadConfig()
    }

    async function save() {
        const name = form.value.name.trim()
        if (!name) {
            saveMsg.value = t('peerReview.nameRequired')
            saveOk.value = false
            return
        }
        const options = form.value.options
            .filter((o) => o.label.trim())
            .map((o) => ({ key: o.key, label: o.label.trim(), maxScore: Number(o.maxScore) || 10 }))
        if (options.length === 0) {
            saveMsg.value = t('peerReview.optionRequired')
            saveOk.value = false
            return
        }

        saving.value = true
        saveMsg.value = ''
        try {
            if (props.cid) {
                await cRequest('/api/peer-reviews/update', {
                    method: 'POST',
                    body: { course_id: effectiveCourseId.value, cid: props.cid, name, options },
                })
            } else {
                const result = await cRequest('/api/peer-reviews/add', {
                    method: 'POST',
                    body: { course_id: effectiveCourseId.value, name, options },
                })
                emit('saved', result?.data || { cid: result?.cid })
                saveMsg.value = t('common.saveSuccess')
                saveOk.value = true
                return
            }
            emit('saved', { cid: props.cid, name, options })
            saveMsg.value = t('common.saveSuccess')
            saveOk.value = true
        } catch (e: any) {
            saveMsg.value = e?.message || t('common.operationFailed')
            saveOk.value = false
        } finally {
            saving.value = false
        }
    }

    return {
        loading, saving, saveMsg, saveOk, form,
        addOption, removeOption, resetForm, save, effectiveCourseId,
    }
}
