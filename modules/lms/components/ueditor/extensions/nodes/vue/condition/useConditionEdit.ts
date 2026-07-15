import { ref, computed, onMounted } from 'vue'

export interface ConditionEditProps {
    config?: any
}

export type ConditionEditEmit = (event: 'update:config' | 'close', ...args: any[]) => void

export function useConditionEdit(props: ConditionEditProps, emit: ConditionEditEmit) {
    const { t } = useI18n()
    const { chapterId } = useLmsContext()

    const chapterTaskIds = ref({
        questionIds: [] as number[],
        homeworkIds: [] as number[],
        commentIds: [] as number[],
        quizIds: [] as number[],
        raceIds: [] as number[],
    })

    const questionOptions = computed(() =>
        (chapterTaskIds.value.questionIds || []).map(id => ({ label: `#${id}`, value: String(id) }))
    )
    const homeworkOptions = computed(() =>
        (chapterTaskIds.value.homeworkIds || []).map(id => ({ label: `#${id}`, value: String(id) }))
    )
    const commentOptions = computed(() =>
        (chapterTaskIds.value.commentIds || []).map(id => ({ label: `#${id}`, value: String(id) }))
    )
    const quizOptions = computed(() =>
        (chapterTaskIds.value.quizIds || []).map(id => ({ label: `#${id}`, value: String(id) }))
    )
    const raceOptions = computed(() =>
        (chapterTaskIds.value.raceIds || []).map(id => ({ label: `#${id}`, value: String(id) }))
    )

    /** from tiptap JSON content Middleextract specified vue nodePointType CID */
    function extractVueNodeIds(content: any, type: string) {
        const ids: number[] = []
        function traverse(node: any) {
            if (!node || typeof node !== 'object') return
            if (node.type === 'vue' && node.attrs?.type === type && node.attrs?.content) {
                const numId = Number(node.attrs.content)
                if (!isNaN(numId)) ids.push(numId)
            }
            if (Array.isArray(node.content)) {
                for (const child of node.content) traverse(child)
            } else if (node.content && typeof node.content === 'object') {
                traverse(node.content)
            }
        }
        if (Array.isArray(content)) {
            for (const node of content) traverse(node)
        } else if (content) {
            traverse(content)
        }
        return ids
    }

    async function loadChapterTasks() {
        if (!chapterId.value) return
        try {
            const data = await cRequest(`/api/chapters/show?id=${chapterId.value}`)
            if (data?.chapter) {
                const content = data.chapter.content
                chapterTaskIds.value = {
                    questionIds: data.chapter.questionIds || [],
                    homeworkIds: data.chapter.homeworkIds || [],
                    commentIds: data.chapter.commentIds || [],
                    quizIds: extractVueNodeIds(content, 'quiz'),
                    raceIds: extractVueNodeIds(content, 'race'),
                }
            }
        } catch (e) {
            console.error('[condition] LoadChapterTaskFailed', e)
        }
    }

    function updateTaskLabel(idx: number, val: any, type: string) {
        const map: any = { question: questionOptions, homework: homeworkOptions, comment: commentOptions, quiz: quizOptions, race: raceOptions }
        const opts = map[type].value
        const vals = Array.isArray(val) ? val : [val]
        const labels = vals.map((v: string) => opts.find((o: any) => o.value === v)?.label || v)
        editConditions.value[idx].label = labels.join(', ')
    }

    const editConditions = ref<any[]>([...(props.config?.conditions || [])])
    const editContent = ref(props.config?.content || '')

    const conditionTypes = computed(() => [
        { label: t('ueditor.conditionRole'), value: 'role' },
        { label: t('ueditor.condition Class'), value: 'class' },
        { label: t('ueditor.condition Question'), value: 'question' },
        { label: t('ueditor.conditionHomework'), value: 'homework' },
        { label: t('ueditor.conditionComment'), value: 'comment' },
        { label: t('ueditor.conditionQuiz'), value: 'quiz' },
        { label: t('ueditor.conditionRace'), value: 'race' },
    ])

    const roleOptions = [
        { label: 'Admin', value: 'admin' },
        { label: 'Teacher', value: 'teacher' },
        { label: 'Student', value: 'student' },
    ]

    const classOptions = ref<any[]>([])

    async function loadClasses() {
        try {
            const resp = await $fetch('/api/classes/list')
            if (resp.success && resp.data) {
                classOptions.value = resp.data.map((c: any) => ({ label: c.name, value: String(c.id) }))
            }
        } catch (e) {
            console.error('[condition] LoadClassFailed', e)
        }
    }

    function updateClassLabel(idx: number, val: string) {
        const opt = classOptions.value.find(o => o.value === val)
        if (opt) editConditions.value[idx].label = opt.label
    }

    onMounted(() => {
        editConditions.value = (props.config?.conditions || []).map((c: any) => {
            const taskTypes = ['question', 'homework', 'comment', 'quiz', 'race']
            if (taskTypes.includes(c.type)) {
                return { ...c, value: Array.isArray(c.value) ? c.value : (c.value ? [c.value] : []) }
            }
            return { ...c }
        })
        editContent.value = props.config?.content || ''
        if (classOptions.value.length === 0) loadClasses()
        loadChapterTasks()
    })

    function apply() {
        const newConfig = {
            conditions: editConditions.value.filter(c => {
                if (Array.isArray(c.value)) return c.value.length > 0
                return String(c.value || '').trim()
            }),
            content: editContent.value,
        }
        emit('update:config', newConfig)
        emit('close')
    }

    return {
        t, editConditions, editContent, conditionTypes, roleOptions, classOptions,
        questionOptions, homeworkOptions, commentOptions, quizOptions, raceOptions,
        updateTaskLabel, updateClassLabel, apply,
    }
}
