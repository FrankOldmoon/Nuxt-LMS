import { ref, computed, watch } from 'vue'

export interface QuizRecordsProps {
    modelValue: boolean
    courseId: number
    cid: number
    quizPoint: number
    /** quiz 题目列表：[{ id, point }] */
    questions: Array<{ id: number; point: number }>
}

export type QuizRecordsEmit = (event: 'update:modelValue', value: boolean) => void

export function useQuizRecords(props: QuizRecordsProps, emit: QuizRecordsEmit) {
    const { t } = useI18n()
    const { students, fetchUsers, currentClassId } = useClassUsers()

    const open = computed({
        get: () => props.modelValue,
        set: (v) => emit('update:modelValue', v),
    })

    const rows = ref<any[]>([])
    const pending = ref(false)

    // 额外列：总分 + 正确率 + 提交次数 + 每道题一列 + 答卷
    // canSort 时通过 accessorFn 从 row.record 嵌套字段取值（TanStack 默认按 accessorKey 取顶层字段，取不到值排序会失效）
    const extraColumns = computed(() => {
        const cols = [
            {
                id: 'score', header: t('quiz.score'), canSort: true,
                accessorFn: (row: any) => (row.record ? Number(row.record.score) : -1),
            },
            {
                id: 'correctRate', header: t('quiz.correctRate'), canSort: true,
                accessorFn: (row: any) => (row.record && props.quizPoint > 0 ? (Number(row.record.score) || 0) / props.quizPoint : -1),
            },
            {
                id: 'submitCount', header: t('quiz.submitLimit'), canSort: true,
                accessorFn: (row: any) => (row.record?.submitCount ?? -1),
            },
        ]
        // 每道题一列，列名为 Q1/Q2/...（未作答/无记录取 -1 排在最后）
        props.questions.forEach((q, idx) => {
            cols.push({
                id: `q${q.id}`,
                header: `Q${idx + 1}`,
                canSort: true,
                accessorFn: (row: any) => {
                    const r = getQuestionRecord(row, q.id)
                    return r ? Number(r.rate) || 0 : -1
                },
            })
        })
        // 答卷操作列
        cols.push({ id: 'detail', header: t('record.viewDetail') })
        return cols
    })

    const defaultSort = [{ id: 'score', desc: true }]

    // 从用户的 record 中提取某道题的答题记录
    function getQuestionRecord(rowData, questionCid) {
        const records = rowData?.record?.records
        if (!Array.isArray(records)) return null
        return records.find(r => Number(r.questionCid) === Number(questionCid)) || null
    }

    // ====================== 统计概览 ======================
    const summary = computed(() => {
        const total = rows.value.length
        const submitted = rows.value.filter(r => r.record)
        const scores = submitted.map(r => Number(r.record.score) || 0)
        const passed = submitted.filter(r => r.record.isPassed).length
        return {
            total,
            submitted: submitted.length,
            avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : 0,
            passCount: passed,
            passRate: submitted.length ? Math.round((passed / submitted.length) * 100) : 0,
            topScore: scores.length ? Math.max(...scores) : 0,
        }
    })

    function buildRows(recordsData) {
        const recordMap = new Map((recordsData || []).map(r => [r.userId, r.record]))
        rows.value = students.value.map(s => ({
            id: s.id,
            name: s.name,
            preferName: s.preferName,
            rollNumber: s.rollNumber,
            username: s.username,
            avatarImg: s.avatarImg,
            avatarFrame: s.avatarFrame,
            record: recordMap.get(s.id) || null,
        }))
        // 有记录的排前面，按分数降序
        rows.value.sort((a, b) => {
            const aHas = a.record ? 1 : 0
            const bHas = b.record ? 1 : 0
            if (bHas !== aHas) return bHas - aHas
            if (aHas && bHas) {
                return (Number(b.record.score) || 0) - (Number(a.record.score) || 0)
            }
            return 0
        })
    }

    async function fetchRecords() {
        if (!props.courseId || !props.cid) {
            rows.value = []
            return
        }
        buildRows([])
        pending.value = true
        try {
            const data = await cRequest(`/api/quizzes/records?course_id=${props.courseId}&cid=${props.cid}`)
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

    // 弹窗内切换班级：useClassUsers 全局 students 变化后重建该班记录
    watch(() => students.value, () => fetchRecords())

    // ====================== 答卷详情弹窗 ======================
    const detailOpen = ref(false)
    const detailRow = ref<any>(null)

    function openDetail(row) {
        if (!row?.record) return
        detailRow.value = row
        detailOpen.value = true
    }
    function closeDetail() {
        detailOpen.value = false
        detailRow.value = null
    }

    // 该生某道题的作答（传给 QuestionRender 预填）
    function getInitialRecord(questionCid: number) {
        const r = detailRow.value ? getQuestionRecord(detailRow.value, questionCid) : null
        return r ? { record: Array.isArray(r.answer) ? r.answer : [], rate: Number(r.rate) || 0 } : null
    }

    // 及格判定：优先用后端 isPassed（与判分 passScore 一致），兜底按 60%
    function scoreClass(record: any) {
        if (record?.isPassed !== undefined) {
            return record.isPassed ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'
        }
        const score = Number(record?.score) || 0
        const passScore = props.quizPoint * 0.6
        return score >= passScore ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'
    }

    function formatRate(record) {
        const score = Number(record?.score) || 0
        const rate = props.quizPoint > 0 ? score / props.quizPoint : 0
        return `${Math.round(rate * 100)}%`
    }

    function rateIcon(record) {
        if (record?.isPassed !== undefined && record.isPassed) return 'i-heroicons-check-circle'
        const score = Number(record?.score) || 0
        const rate = props.quizPoint > 0 ? score / props.quizPoint : 0
        if (rate >= 0.6) return 'i-heroicons-check-circle'
        if (rate > 0) return 'i-heroicons-exclamation-circle'
        return 'i-heroicons-x-circle'
    }

    function rateIconClass(record) {
        if (record?.isPassed !== undefined && record.isPassed) return 'text-green-500'
        const score = Number(record?.score) || 0
        const rate = props.quizPoint > 0 ? score / props.quizPoint : 0
        if (rate >= 0.6) return 'text-green-500'
        if (rate > 0) return 'text-yellow-500'
        return 'text-red-500'
    }

    return {
        open, rows, pending, extraColumns, defaultSort, fetchRecords,
        getQuestionRecord, scoreClass, formatRate, rateIcon, rateIconClass,
        summary, detailOpen, detailRow, openDetail, closeDetail, getInitialRecord,
    }
}
