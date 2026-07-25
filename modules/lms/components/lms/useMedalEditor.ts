import { ref, reactive, onMounted } from 'vue'

export function useMedalEditor() {
    const { t } = useI18n()
    const toast = useToast()

    const loading = ref(true)
    const saving = ref(false)
    const deletingId = ref<any>(null)
    const medals = ref<any[]>([])

    const tierOpts = [
        { label: t('medal.tier1'), value: 1 },
        { label: t('medal.tier2'), value: 2 },
        { label: t('medal.tier3'), value: 3 },
        { label: t('medal.tier4'), value: 4 },
    ]
    const colorOpts = [
        { label: 'Bronze', value: 'bronze' },
        { label: 'Silver', value: 'silver' },
        { label: 'Gold', value: 'gold' },
        { label: 'Diamond', value: 'diamond' },
        { label: 'Primary', value: 'primary' },
        { label: 'Success', value: 'success' },
        { label: 'Warning', value: 'warning' },
        { label: 'Error', value: 'error' },
        { label: 'Info', value: 'info' },
    ]
    const logicOpts = [
        { label: t('medal.logicAll'), value: 'all' },
        { label: t('medal.logicAny'), value: 'any' },
    ]
    const metricOpts = [
        { label: t('medal.metricCourseScore'), value: 'courseScore' },
        { label: t('medal.metricExp'), value: 'exp' },
        { label: t('medal.metricLevel'), value: 'level' },
        { label: t('medal.metricQuestionScore'), value: 'questionScore' },
        { label: t('medal.metricHomeworkScore'), value: 'homeworkScore' },
        { label: t('medal.metricCommentScore'), value: 'commentScore' },
        { label: t('medal.metricQuizScore'), value: 'quizScore' },
        { label: t('medal.metricRaceScore'), value: 'raceScore' },
        { label: t('medal.metricQuestionCount'), value: 'questionCount' },
        { label: t('medal.metricHomeworkCount'), value: 'homeworkCount' },
        { label: t('medal.metricCommentCount'), value: 'commentCount' },
        { label: t('medal.metricChapterPassCount'), value: 'chapterPassCount' },
    ]
    const opOpts = [
        { label: '≥', value: '>=' },
        { label: '>', value: '>' },
        { label: '≤', value: '<=' },
        { label: '<', value: '<' },
        { label: '=', value: '==' },
    ]

    function iconColorClass(color: any) {
        const map: Record<string, string> = {
            bronze: 'text-amber-700',
            silver: 'text-gray-400',
            gold: 'text-amber-400',
            diamond: 'text-cyan-400',
            primary: 'text-primary',
            success: 'text-success',
            warning: 'text-warning',
            error: 'text-error',
            info: 'text-info',
        }
        return map[color] || 'text-primary'
    }

    // 图标全名：兼容 i-lucide-xxx 和 lucide:xxx，无前缀时补 i-lucide-
    function fullIconName(name: string) {
        if (!name) return 'i-lucide-award'
        if (name.startsWith('i-') || name.includes(':')) return name
        return `i-lucide-${name}`
    }

    async function loadMedals() {
        loading.value = true
        try {
            const data = await cRequest('/api/medals/list')
            // 用 reactive 包裹，确保深层属性变更（如 content.icon）能触发响应式更新
            medals.value = (data || []).map((m: any) => reactive(m))
        } catch {
            medals.value = []
        } finally {
            loading.value = false
        }
    }

    function addCondition(medal: any) {
        if (!medal.content.conditions) medal.content.conditions = []
        medal.content.conditions.push({ metric: 'courseScore', op: '>=', value: 0 })
    }

    function addMedal() {
        medals.value.push(reactive({
            id: 0,
            name: '',
            content: {
                icon: 'i-lucide-award',
                color: 'primary',
                tier: 1,
                description: '',
                conditions: [{ metric: 'courseScore', op: '>=', value: 0 }],
                logic: 'all',
            },
        }))
    }

    async function deleteMedal(id: any) {
        if (!id) {
            // 未保存的新项，直接从列表移除
            medals.value = medals.value.filter(m => m.id !== id)
            return
        }
        deletingId.value = id
        try {
            await cRequest('/api/medals/delete', { method: 'POST', body: { id } })
            medals.value = medals.value.filter(m => m.id !== id)
            toast.add({ title: t('medal.deleted'), color: 'success' })
        } catch (e: any) {
            toast.add({ title: e.message, color: 'error' })
        } finally {
            deletingId.value = null
        }
    }

    async function saveAll() {
        saving.value = true
        try {
            for (const medal of medals.value) {
                if (medal.id) {
                    await cRequest('/api/medals/update', {
                        method: 'POST',
                        body: { id: medal.id, name: medal.name, content: medal.content },
                    })
                } else {
                    const result = await cRequest('/api/medals/add', {
                        method: 'POST',
                        body: { name: medal.name, content: medal.content },
                    })
                    medal.id = result.id
                }
            }
            toast.add({ title: t('medal.saved'), color: 'success' })
        } catch (e: any) {
            toast.add({ title: e.message, color: 'error' })
        } finally {
            saving.value = false
        }
    }

    onMounted(loadMedals)

    return {
        loading, medals, fullIconName, iconColorClass, tierOpts, colorOpts,
        logicOpts, metricOpts, opOpts, addCondition, deletingId, deleteMedal,
        addMedal, saving, saveAll,
    }
}
