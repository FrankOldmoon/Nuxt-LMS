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

    // 额外列：总分 + 正确率 + 提交次数 + 每道题一列
    const extraColumns = computed(() => {
        const cols = [
            { id: 'score', header: t('quiz.score') },
            { id: 'correctRate', header: t('quiz.correctRate') },
            { id: 'submitCount', header: t('quiz.submitLimit') },
        ]
        // 每道题一列，列名为 Q1/Q2/...
        props.questions.forEach((q, idx) => {
            cols.push({
                id: `q${q.id}`,
                header: `Q${idx + 1}`,
            })
        })
        return cols
    })

    const defaultSort = [{ id: 'score', desc: true }]

    // 从用户的 record 中提取某道题的答题记录
    function getQuestionRecord(rowData, questionCid) {
        const records = rowData?.record?.records
        if (!Array.isArray(records)) return null
        return records.find(r => Number(r.questionCid) === Number(questionCid)) || null
    }

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

    function scoreClass(record: any) {
        const score = Number(record.score) || 0
        const passScore = props.quizPoint * 0.6
        if (score >= passScore) return 'text-green-600 dark:text-green-300'
        return 'text-red-600 dark:text-red-300'
    }

    function formatRate(record) {
        const score = Number(record.score) || 0
        const rate = props.quizPoint > 0 ? score / props.quizPoint : 0
        return `${Math.round(rate * 100)}%`
    }

    function rateIcon(record) {
        const score = Number(record.score) || 0
        const rate = props.quizPoint > 0 ? score / props.quizPoint : 0
        if (rate >= 0.6) return 'i-heroicons-check-circle'
        if (rate > 0) return 'i-heroicons-exclamation-circle'
        return 'i-heroicons-x-circle'
    }

    function rateIconClass(record) {
        const score = Number(record.score) || 0
        const rate = props.quizPoint > 0 ? score / props.quizPoint : 0
        if (rate >= 0.6) return 'text-green-500'
        if (rate > 0) return 'text-yellow-500'
        return 'text-red-500'
    }

    return {
        open, rows, pending, extraColumns, defaultSort,
        getQuestionRecord, scoreClass, formatRate, rateIcon, rateIconClass,
    }
}
