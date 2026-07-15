import { ref, computed, watch } from 'vue'
import { computeCorrectRate } from '../../../ueditor/extensions/nodes/vue/question/render/shared'

export interface QuestionRecordsProps {
    modelValue: boolean
    courseId: number
    cid: number
    question: any
}

export type QuestionRecordsEmit = (event: 'update:modelValue', value: boolean) => void

export function useQuestionRecords(props: QuestionRecordsProps, emit: QuestionRecordsEmit) {
    const { t } = useI18n()
    const { students, fetchUsers, currentClassId } = useClassUsers()

    const open = computed({
        get: () => props.modelValue,
        set: (v) => emit('update:modelValue', v),
    })

    const rows = ref<any[]>([])
    const pending = ref(false)

    const extraColumns = computed(() => [{
        id: 'record',
        header: t('record.colRecord'),
        sortingFn: (a, b) => (a.original.record ? 1 : 0) - (b.original.record ? 1 : 0),
    },{
        id: 'score',
        header: t('record.score'),
        canSort: true,
        sortingFn: (a, b) => (a.original.record?.score || 0) - (b.original.record?.score || 0),
    }])

    const defaultSort = [{ id: 'score', desc: true }]

    // firstuseCacheStudentDatafill table，thenAsynccombinedand records
    function buildRows(recordsData) {
        const recordMap = new Map((recordsData || []).map(r => [r.userId, r.record]))
        rows.value = students.value.map(s => ({
            id: s.id,
            name: s.name,
            preferName: s.preferName,
            rollNumber: s.rollNumber,
            avatarImg: s.avatarImg,
            record: recordMap.get(s.id) || null,
        }))
        // HasRecordsrowFrontSurface
        rows.value.sort((a, b) => {
            const aHas = a.record ? 1 : 0
            const bHas = b.record ? 1 : 0
            return bHas - aHas
        })
    }

    async function fetchRecords() {
        if (!props.courseId || !props.cid) {
            rows.value = []
            return
        }
        // firstuseCacheStudentDataimmediatelythat isShow table
        buildRows([])
        pending.value = true
        try {
            const data = await cRequest(`/api/questions/records?course_id=${props.courseId}&cid=${props.cid}`)
            buildRows(data)
        } catch {
            rows.value = []
        } finally {
            pending.value = false
        }
    }

    watch(open, (val) => {
        if (val) fetchRecords()
    })

    // format answerContent
    function formatUserAnswer(record: any) {
        const userAns = Array.isArray(record?.records) ? record.records : []
        const q = props.question
        if (!q) return userAns.map(String)
        const type = q.type

        if (type === 'single' || type === 'judge' || type === 'multiple') {
            return userAns.map(idx => String.fromCharCode(65 + Number(idx)))
        }
        if (type === 'sort') {
            // ShowUserrowcolumnsoptionitemsText
            const options = q.options || []
            return userAns.map(idx => options[idx] || `#${idx}`)
        }
        if (type === 'classify') {
            // ShoweachitemsanditsscoretoCategory
            const options = q.options || []
            const flatItems = []
            options.forEach(cat => {
                (cat.items || []).forEach(item => flatItems.push(item))
            })
            return userAns.map((catIdx, i) => {
                const cat = options[catIdx]
                const catName = cat?.name || `#${Number(catIdx) + 1}`
                return `${flatItems[i] || `#${i}`} → ${catName}`
            })
        }
        if (type === 'puzzle') {
            // Puzzle：ShowUserrowcolumnsNumber
            return userAns.map((idx, i) => `#${i + 1}→${Number(idx) + 1}`)
        }
        if (type === 'html') {
            // HTML question：Show correct_rate
            return [`${t('question.htmlCorrectRate')}: ${Math.round((Number(userAns[0]) || 0) * 100)}%`]
        }
        if (type === 'short-answer') {
            // Short Answer：ShowUserInputText
            return [String(userAns[0] || '')]
        }
        if (type === 'match') {
            // connectLinequestion：ShowUsermatchRight（left → right Text）
            const options = q.options || []
            return options.map((pair, i) => {
                const rightIdx = Number(userAns[i])
                if (rightIdx < 0 || isNaN(rightIdx)) return `${pair.left} → ?`
                const rightPair = options[rightIdx]
                return `${pair.left} → ${rightPair?.right || '?'}`
            })
        }
        if (type === 'composite') {
            // Bigquestion：Showeachchild questionScorerate
            const subs = Array.isArray(q.content) ? q.content : []
            return subs.map((sub, i) => {
                const subRecord = Array.isArray(userAns[i]) ? userAns[i] : []
                const subQ = { ...sub, record: subRecord }
                const rate = computeCorrectRate(subQ)
                return `#${i + 1} ${sub.name || ''}: ${Math.round(rate * 100)}%`
            })
        }
        return userAns.map(String)
    }

    function formatCorrectRate(record) {
        const rate = Number(record?.correctRate) || 0
        if (rate >= 1) return `${t('record.correct')} ( ${record.score} ${t('record.scoreUnit')} )`
        if (rate > 0) return `${t('record.partial')} ${Math.round(rate * 100)}% ( ${record.score} ${t('record.scoreUnit')} )`
        return `${t('record.wrong')} ( ${record.score} ${t('record.scoreUnit')} )`
    }

    function answerItemClass(record, idx) {
        const q = props.question
        if (!q) return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
        const userAns = Array.isArray(record?.records) ? record.records : []
        const answer = Array.isArray(q.answer) ? q.answer : []
        const type = q.type
        const val = userAns[idx]

        if (type === 'single' || type === 'judge' || type === 'multiple') {
            return answer.includes(Number(val))
                ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
        }
        if (type === 'sort') {
            // RightthaneachitemsPositionIndexYesNoCorrect
            return Number(val) === Number(answer[idx])
                ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
        }
        if (type === 'classify') {
            // RightthaneachitemsCategoryIndexYesNoCorrect
            return Number(val) === Number(answer[idx])
                ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
        }
        if (type === 'puzzle') {
            // RightthaneachitemsPositionoriginalStartIndexYesNoCorrect
            return Number(val) === Number(answer[idx])
                ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
        }
        if (type === 'html') {
            // HTML question：based on correct_rate Color
            const rate = Number(val) || 0
            if (rate >= 1) return 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
            if (rate > 0) return 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-300'
            return 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
        }
        if (type === 'short-answer') {
            // Short Answer：useregex judgment
            try {
                const re = new RegExp(answer[0] || '')
                return re.test(String(val || ''))
                    ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
                    : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
            } catch {
                return 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
            }
        }
        if (type === 'match') {
            // connectLinequestion：Rightthan left[idx] YesNoconnectto right[idx]
            return Number(val) === Number(answer[idx])
                ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
        }
        if (type === 'composite') {
            // Bigquestion：based onchild questionScorerateColor
            const subs = Array.isArray(q.content) ? q.content : []
            const sub = subs[idx]
            if (!sub) return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
            const subQ = { ...sub, record: Array.isArray(val) ? val : [] }
            const rate = computeCorrectRate(subQ)
            if (rate >= 1) return 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
            if (rate > 0) return 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-300'
            return 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
        }
        return String(val).trim() === String(answer[idx] || '').trim()
            ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
    }

    function recordIconClass(record) {
        const rate = Number(record?.correctRate) || 0
        if (rate >= 1) return 'text-green-500'
        if (rate > 0) return 'text-yellow-500'
        return 'text-red-500'
    }

    function recordIcon(record: any) {
        const rate = Number(record?.correctRate) || 0
        if (rate >= 1) return 'i-heroicons-check-circle'
        if (rate > 0) return 'i-heroicons-exclamation-circle'
        return 'i-heroicons-x-circle'
    }

    // ====================== optionitemsoption distribution bar chart（single/multiple） ======================
    const showOptionChart = computed(() => {
        const type = props.question?.type
        return type === 'single' || type === 'multiple'
    })

    // StatisticseachitemsoptionitemsSelectPersoncount
    const optionCounts = computed(() => {
        const q = props.question
        if (!q || !showOptionChart.value) return []
        const options = q.options || []
        const counts = new Array(options.length).fill(0)
        for (const row of rows.value) {
            const rec = row.record
            if (!rec || !Array.isArray(rec.records)) continue
            for (const idx of rec.records) {
                const i = Number(idx)
                if (i >= 0 && i < counts.length) counts[i]++
            }
        }
        return options.map((opt, i) => ({
            label: String.fromCharCode(65 + i),
            text: typeof opt === 'string' ? opt : (opt?.text || opt?.name || ''),
            count: counts[i],
            isCorrect: Array.isArray(q.answer) && q.answer.includes(i),
        }))
    })

    const optionChartOption = computed(() => {
        const data = optionCounts.value
        if (!data.length) return {}
        const correctAnswer = Array.isArray(props.question?.answer) ? props.question.answer : []
        return {
            grid: { left: 40, right: 20, top: 20, bottom: 60 },
            xAxis: {
                type: 'category',
                data: data.map(d => d.label),
                axisLabel: { fontSize: 12, color: '#6b7280' },
                axisTick: { show: false },
                axisLine: { lineStyle: { color: '#e5e7eb' } },
            },
            yAxis: {
                type: 'value',
                minInterval: 1,
                splitLine: { show: true, lineStyle: { type: 'dashed', color: '#e5e7eb' } },
                axisLabel: { fontSize: 10, color: '#9ca3af' },
            },
            series: [{
                type: 'bar',
                data: data.map(d => ({
                    value: d.count,
                    itemStyle: {
                        color: d.isCorrect ? '#22c55e' : '#60a5fa',
                        borderRadius: [4, 4, 0, 0],
                    },
                })),
                barWidth: '50%',
                label: {
                    show: true,
                    position: 'top',
                    fontSize: 12,
                    fontWeight: 'bold',
                    color: '#374151',
                    formatter: '{c}',
                },
                animationDuration: 600,
            }],
            tooltip: {
                trigger: 'axis',
                formatter: (params) => {
                    const idx = params[0]?.dataIndex
                    if (idx == null) return ''
                    const d = data[idx]
                    return `${d.label}: ${d.text}<br/>${t('record.selectedCount')}: ${d.count}${d.isCorrect ? ` (${t('record.correctAnswer')})` : ''}`
                },
            },
            animation: true,
            animationDuration: 600,
        }
    })

    return {
        open, rows, pending, extraColumns, defaultSort,
        recordIcon, recordIcon Class, formatUserAnswer, answerItemClass, formatCorrectRate,
        showOptionChart, optionChartOption,
    }
}
