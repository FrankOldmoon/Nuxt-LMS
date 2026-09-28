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

    // ====================== OJ 题：查看学生 OJ 提交代码 ======================
    const isOj = computed(() => props.question?.type === 'oj')
    const ojUrl = ref('')
    const ojRecords = ref<Map<number, any>>(new Map())
    const ojPending = ref(false)

    // 列定义：record / score 两列。OJ 题的「查看代码」直接渲染在 record 列内（见 index.vue），不单开一列
    const extraColumns = computed(() => [{
        id: 'record',
        header: t('record.colRecord'),
        sortingFn: (a, b) => (a.original.record ? 1 : 0) - (b.original.record ? 1 : 0),
    }, {
        id: 'score',
        header: t('record.score'),
        canSort: true,
        sortingFn: (a, b) => (a.original.record?.score || 0) - (b.original.record?.score || 0),
    }])

    const defaultSort = [{ id: 'score', desc: true }]

    // 最近一次 records 数据（OJ 记录异步返回后据此重建 rows）
    let lastRecordsData: any[] = []

    // 先用缓存学生数据填充 table，再异步合并 records
    function buildRows(recordsData) {
        lastRecordsData = recordsData || []
        const recordMap = new Map(lastRecordsData.map(r => [r.userId, r.record]))
        rows.value = students.value.map(s => ({
            id: s.id,
            name: s.name,
            preferName: s.preferName,
            rollNumber: s.rollNumber,
            username: s.username,
            avatarImg: s.avatarImg,
            avatarFrame: s.avatarFrame,
            record: recordMap.get(s.id) || null,
            oj: ojRecords.value.get(s.id) || null,
        }))
        // 有记录的排前面
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
        // 先用缓存学生数据立即显示 table
        buildRows([])
        pending.value = true
        try {
            const data = await cRequest(`/api/questions/records?course_id=${props.courseId}&cid=${props.cid}`)
            buildRows(data)
        } catch {
            buildRows([])
        } finally {
            pending.value = false
        }
        // OJ 题：额外拉取每个学生在 OJ 上的提交记录
        if (isOj.value) fetchOjRecords()
    }

    async function fetchOjRecords() {
        ojPending.value = true
        try {
            const data = await cRequest(`/api/questions/oj-records?course_id=${props.courseId}&cid=${props.cid}`)
            ojUrl.value = data?.url || ''
            const map = new Map<number, any>()
            for (const r of (data?.records || [])) map.set(r.userId, r)
            ojRecords.value = map
        } catch {
            ojRecords.value = new Map()
        } finally {
            ojPending.value = false
            buildRows(lastRecordsData)
        }
    }

    // 打开学生最新一次 OJ 提交的记录页（代码需在 OJ 侧已登录且有权查看）
    function openOjRecord(row: any) {
        const rid = row?.original?.oj?.rid
        if (!rid || !ojUrl.value) return
        window.open(`${ojUrl.value}/record/${rid}`, '_blank', 'noopener')
    }

    watch(open, (val) => {
        if (val) fetchRecords()
    })

    // 弹窗内切换班级：useClassUsers 全局 students 变化后重建该班记录
    watch(() => students.value, () => fetchRecords())

    // 格式化作答内容
    function formatUserAnswer(record: any) {
        const userAns = Array.isArray(record?.records) ? record.records : []
        const q = props.question
        if (!q) return userAns.map(String)
        const type = q.type

        if (type === 'single' || type === 'judge' || type === 'multiple') {
            return userAns.map(idx => String.fromCharCode(65 + Number(idx)))
        }
        if (type === 'sort') {
            // 显示用户排列的选项文本
            const options = q.options || []
            return userAns.map(idx => options[idx] || `#${idx}`)
        }
        if (type === 'classify') {
            // 显示每项及其被分到的分类
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
            // 拼图题：显示用户排列的序号
            return userAns.map((idx, i) => `#${i + 1}→${Number(idx) + 1}`)
        }
        if (type === 'html') {
            // HTML 题：显示 correct_rate
            return [`${t('question.htmlCorrectRate')}: ${Math.round((Number(userAns[0]) || 0) * 100)}%`]
        }
        if (type === 'short-answer') {
            // 简答题：显示用户输入文本
            return [String(userAns[0] || '')]
        }
        if (type === 'match') {
            // 连线题：显示用户的配对（left → right 文本）
            const options = q.options || []
            return options.map((pair, i) => {
                const rightIdx = Number(userAns[i])
                if (rightIdx < 0 || isNaN(rightIdx)) return `${pair.left} → ?`
                const rightPair = options[rightIdx]
                return `${pair.left} → ${rightPair?.right || '?'}`
            })
        }
        if (type === 'composite') {
            // 大题：显示各子题的得分率
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

        // show 不再对学生下发答案：无 answer（且非客户端判定型）时无法逐项比对，显示中性色
        const clientJudged = type === 'html'
        if (!answer.length && !clientJudged) {
            return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
        }

        if (type === 'single' || type === 'judge' || type === 'multiple') {
            return answer.includes(Number(val))
                ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
        }
        if (type === 'sort') {
            // 对比每个位置的索引是否正确
            return Number(val) === Number(answer[idx])
                ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
        }
        if (type === 'classify') {
            // 对比每项的分类索引是否正确
            return Number(val) === Number(answer[idx])
                ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
        }
        if (type === 'puzzle') {
            // 对比每个位置的原始索引是否正确
            return Number(val) === Number(answer[idx])
                ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
        }
        if (type === 'html') {
            // HTML 题：根据 correct_rate 着色
            const rate = Number(val) || 0
            if (rate >= 1) return 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
            if (rate > 0) return 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-300'
            return 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
        }
        if (type === 'short-answer') {
            // 简答题：用正则判断
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
            // 连线题：对比 left[idx] 是否连到了 right[idx]
            return Number(val) === Number(answer[idx])
                ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
        }
        if (type === 'composite') {
            // 大题：根据子题得分率着色
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

    // ====================== 选项分布柱状图（single/multiple） ======================
    const showOptionChart = computed(() => {
        const type = props.question?.type
        return type === 'single' || type === 'multiple'
    })

    // 统计每个选项被选择的人数
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
        open, rows, pending, extraColumns, defaultSort, fetchRecords,
        isOj, ojPending, openOjRecord,
        recordIcon, recordIconClass, formatUserAnswer, answerItemClass, formatCorrectRate,
        showOptionChart, optionChartOption,
    }
}
