import { ref, computed, watch, provide, inject, type InjectionKey } from 'vue'
import QuestionRender from '../extensions/nodes/vue/question/render.vue'
import HomeworkRender from '../extensions/nodes/vue/homework/render.vue'
import CommentRender from '../extensions/nodes/vue/comment/render.vue'
import QuizRender from '../extensions/nodes/vue/quiz/render.vue'
import RaceRender from '../extensions/nodes/vue/race/render.vue'
import { allPrompts } from '../extensions/nodes/vue/question/edit/prompts.js'

export interface ContentPickerProps {
    modelValue: boolean
    type: string
    initialSelected: any[]
    previewMode: boolean
}

export type ContentPickerEmit = (event: 'update:modelValue' | 'confirm', ...args: any[]) => void

type ContentPickerCtx = ReturnType<typeof useContentPicker>
export const ContentPickerKey: InjectionKey<ContentPickerCtx> = Symbol('ContentPicker')
export function useContentPickerContext() {
    const ctx = inject(ContentPickerKey)
    if (!ctx) throw new Error('useContentPickerContext must be used within contentPicker.vue')
    return ctx
}

export function useContentPicker(props: ContentPickerProps, emit: ContentPickerEmit) {
    const { t } = useI18n()
    const { courseId } = useLmsContext()
    const toast = useToast()
    const { moduleLms } = useRuntimeConfig().public

    const open = computed({
        get: () => props.modelValue,
        set: (v) => emit('update:modelValue', v),
    })

    const singularType = computed(() => {
        const map: Record<string, string> = { questions: 'question', homeworks: 'homework', comments: 'comment', quizzes: 'quiz', races: 'race' }
        return map[props.type] || props.type.replace(/s$/, '')
    })

    const currentType = computed(() => props.previewMode ? filterType.value : singularType.value)

    const filterType = ref('question')
    const typeOptions = computed(() => {
        const list = [
            { label: t('courseData.questionLabel'), value: 'question' },
            { label: t('homework.label'), value: 'homework' },
            { label: t('comment.label'), value: 'comment' },
            { label: t('quiz.label'), value: 'quiz' },
        ]
        if (moduleLms) list.push({ label: t('race.label'), value: 'race' })
        return list
    })

    const renderCompMap = computed(() => {
        const map: Record<string, any> = {
            question: QuestionRender, homework: HomeworkRender, comment: CommentRender, quiz: QuizRender,
        }
        if (moduleLms) map.race = RaceRender
        return map
    })
    const renderComp = computed(() => {
        const typ = props.previewMode ? filterType.value : singularType.value
        return renderCompMap.value[typ] || null
    })

    const title = computed(() => {
        if (props.previewMode) return t('courseData.editor')
        const titles: Record<string, string> = {
            questions: t('courseData.selectQuestions'),
            homeworks: t('courseData.selectHomeworks'),
            comments: t('courseData.selectComments'),
            quizzes: t('quiz.label'),
        }
        if (moduleLms) titles.races = t('race.label')
        return titles[props.type] || t('courseData.editor')
    })

    const loading = ref(false)
    const items = ref<any[]>([])
    const keyword = ref('')
    const selected = ref<any[]>([])
    const page = ref(1)
    const pageSize = ref(10)
    const pageSizeOptions = [
        { label: '10', value: 10 }, { label: '20', value: 20 },
        { label: '50', value: 50 }, { label: '100', value: 100 },
    ]
    const currentIndex = ref(0)

    const filtered = computed(() => {
        const kw = keyword.value.trim().toLowerCase()
        if (props.previewMode) {
            const byType = items.value.filter(i => i.type === filterType.value)
            if (!kw) return byType
            return byType.filter(i => (i.name || '').toLowerCase().includes(kw) || String(i.cid).includes(kw))
        }
        if (!kw) return items.value
        return items.value.filter(i => (i.name || '').toLowerCase().includes(kw) || String(i.cid).includes(kw))
    })

    const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
    const pagedItems = computed(() => {
        const start = (page.value - 1) * pageSize.value
        return filtered.value.slice(start, start + pageSize.value)
    })

    function prevPage() { page.value = page.value <= 1 ? totalPages.value : page.value - 1 }
    function nextPage() { page.value = page.value >= totalPages.value ? 1 : page.value + 1 }

    watch(pageSize, () => { page.value = 1 })

    const currentItem = computed(() => filtered.value[currentIndex.value] || null)
    const renderNode = computed(() => ({
        attrs: { type: currentItem.value?.type || '', content: String(currentItem.value?.cid || '') },
    }))

    watch([keyword, () => props.type, filterType], () => { page.value = 1; currentIndex.value = 0 })

    function isSelected(cid: any) { return selected.value.includes(cid) }
    function toggle(cid: any) {
        const idx = selected.value.indexOf(cid)
        if (idx >= 0) selected.value.splice(idx, 1)
        else selected.value.push(cid)
    }

    function prev() {
        if (filtered.value.length === 0) return
        currentIndex.value = (currentIndex.value - 1 + filtered.value.length) % filtered.value.length
    }
    function next() {
        if (filtered.value.length === 0) return
        currentIndex.value = (currentIndex.value + 1) % filtered.value.length
    }

    async function fetchItems() {
        if (!courseId.value) return
        loading.value = true
        try {
            const url = props.previewMode
                ? `/api/courses/content?course_id=${courseId.value}`
                : `/api/courses/content?course_id=${courseId.value}&type=${singularType.value}`
            const data = await cRequest(url)
            items.value = data || []
            currentIndex.value = 0
            page.value = 1
        } catch { items.value = [] }
        finally { loading.value = false }
    }

    function confirm() { emit('confirm', [...selected.value]); open.value = false }

    // ===== 新增/编辑/删除/导入 =====
    const editOpen = ref(false)
    const editType = ref('')
    const editId = ref(0)
    const editData = ref<any>(null)

    async function addNew() {
        editType.value = props.previewMode ? filterType.value : singularType.value
        editId.value = 0
        editData.value = null
        await nextTick()
        editOpen.value = true
    }

    async function editItem(item: any) {
        editType.value = item.type
        editId.value = item.cid
        editData.value = {
            name: item.name || '', content: item.content || '',
            tags: Array.isArray(item.tags) ? [...item.tags] : [], point: item.point || 0, ...item.extra,
        }
        await nextTick()
        editOpen.value = true
    }

    async function editCurrent() { if (currentItem.value) await editItem(currentItem.value) }

    async function onEditSaved() {
        const wasAdding = editId.value === 0
        editOpen.value = false
        await fetchItems()
        if (wasAdding) {
            if (props.previewMode) currentIndex.value = Math.max(0, filtered.value.length - 1)
            else page.value = totalPages.value
        }
    }

    async function deleteItem(item: any) {
        try {
            await cRequest('/api/courses/delete', {
                method: 'POST', body: { course_id: courseId.value, cid: item.cid, type: item.type },
            })
            toast.add({ title: t('courseData.deleted'), color: 'success' })
            fetchItems()
        } catch (err: any) {
            toast.add({ title: err.message || t('courseData.deleteFailed'), color: 'error' })
        }
    }

    async function deleteCurrent() { if (currentItem.value) await deleteItem(currentItem.value) }

    const importOpen = ref(false)
    const importJson = ref(`[\n  {\n    "name": "${t('contentPicker.example')}",\n    "content": "",\n    "point": 1\n  }\n]`)
    const importing = ref(false)
    const importMsg = ref('')
    const importOk = ref(true)

    async function doImport() {
        let importItems: any[]
        try {
            importItems = JSON.parse(importJson.value)
            if (!Array.isArray(importItems)) throw new Error(t('contentPicker.jsonMustBeArray'))
        } catch (err: any) {
            importOk.value = false
            importMsg.value = `${t('courseData.importParseError')}: ${err.message}`
            return
        }
        importing.value = true
        importMsg.value = ''
        const typ = props.previewMode ? filterType.value : singularType.value
        const endpoint: Record<string, string> = {
            question: '/api/questions/add', homework: '/api/homeworks/add',
            comment: '/api/comments/add', quiz: '/api/quizzes/add',
            ...(moduleLms ? { race: '/api/races/add' } : {}),
        }
        const ep = endpoint[typ]
        let success = 0, failed = 0
        for (const item of importItems) {
            try { await cRequest(ep, { method: 'POST', body: { course_id: courseId.value, ...item } }); success++ }
            catch { failed++ }
        }
        importing.value = false
        if (success > 0) {
            importOk.value = true
            importMsg.value = `${t('courseData.importSuccess')}: ${success}${failed > 0 ? t('contentPicker.importFailedCount', { count: failed }) : ''}`
            toast.add({ title: importMsg.value, color: 'success' })
            await fetchItems()
            importOpen.value = false
            if (props.previewMode) currentIndex.value = Math.max(0, filtered.value.length - 1)
            else page.value = totalPages.value
        } else {
            importOk.value = false
            importMsg.value = t('courseData.importFailed')
        }
    }

    async function copyPrompt() {
        try {
            await navigator.clipboard.writeText(allPrompts())
            toast.add({ title: t('common.copied'), color: 'success' })
        } catch {
            toast.add({ title: t('common.copyFailed'), color: 'error' })
        }
    }

    function exportItems() {
        if (!filtered.value.length) return
        const cleanItems = filtered.value.map((item: any) => {
            const { type: _wrapperType, cid, createdAt, updatedAt, extra, ...rest } = item
            const flatExtra = { ...extra }
            if (flatExtra.qtype !== undefined) { flatExtra.type = flatExtra.qtype; delete flatExtra.qtype }
            return { ...rest, ...flatExtra }
        })
        const json = JSON.stringify(cleanItems, null, 2)
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${currentType.value}_export.json`
        a.click()
        URL.revokeObjectURL(url)
        toast.add({ title: t('contentPicker.exportSuccess', { count: cleanItems.length }), color: 'success' })
    }

    watch(open, (val) => {
        if (val) {
            if (!props.previewMode) selected.value = [...props.initialSelected]
            keyword.value = ''
            page.value = 1
            currentIndex.value = 0
            fetchItems()
        }
    })

    const ctx = {
        t, moduleLms, open, title, previewMode: props.previewMode,
        selected, filterType, typeOptions, keyword,
        addNew, importOpen, exportItems,
        loading, filtered, currentItem, renderNode, renderComp, singularType,
        pagedItems, isSelected, toggle, editItem,
        page, pageSize, pageSizeOptions, totalPages, prevPage, nextPage,
        currentIndex, prev, next,
        editOpen, editType, editId, editData, onEditSaved,
        editCurrent, deleteItem, deleteCurrent,
        importJson, importing, importMsg, importOk, doImport, copyPrompt,
        currentType, confirm,
    }
    provide(ContentPickerKey, ctx)
    return ctx
}
