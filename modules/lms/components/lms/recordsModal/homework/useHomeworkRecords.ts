import { ref, computed, watch, reactive } from 'vue'

export interface HomeworkRecordsProps {
    modelValue: boolean
    courseId: number
    cid: number
    maxScore: number
}

export type HomeworkRecordsEmit = (event: 'update:modelValue', value: boolean) => void

export function useHomeworkRecords(props: HomeworkRecordsProps, emit: HomeworkRecordsEmit) {
    const { t } = useI18n()
    const { students } = useClassUsers()
    const { chapterId } = useLmsContext()

    const open = computed({
        get: () => props.modelValue,
        set: (v) => emit('update:modelValue', v),
    })

    const rows = ref([])
    const pending = ref(false)

    const extraColumns = computed(() => [
        {
            id: 'record',
            header: t('record.colRecord'),
            sortingFn: (a, b) => (a.original.record ? 1 : 0) - (b.original.record ? 1 : 0),
        },
        { id: 'score', header: t('record.score'), canSort: true },
    ])

    const defaultSort = [{ id: 'record', desc: true }]

    const scoreMap = reactive({})

    // 先用缓存学生数据填充 table，再异步合并 records
    function buildRows(recordsData) {
        const recordMap = new Map((recordsData || []).map(r => [r.userId, r.record]))
        rows.value = students.value.map(s => {
            const record = recordMap.get(s.id) || null
            scoreMap[s.id] = record?.score != null ? Number(record.score) : null
            return {
                id: s.id,
                name: s.name,
                preferName: s.preferName,
                rollNumber: s.rollNumber,
                username: s.username,
                avatarImg: s.avatarImg,
                record,
            }
        })
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
        buildRows([])
        pending.value = true
        try {
            const data = await cRequest(`/api/homeworks/records?course_id=${props.courseId}&cid=${props.cid}`)
            buildRows(data)
        } catch {
            rows.value = []
        } finally {
            pending.value = false
        }
    }

    // 保存打分
    async function onScoreBlur(row) {
        const val = scoreMap[row.id]
        if (val === null || val === undefined || val === '') return
        const original = row.record?.score != null ? Number(row.record.score) : null
        if (original === Number(val)) return

        try {
            await cRequest('/api/homeworks/score', {
                method: 'POST',
                body: {
                    course_id: props.courseId,
                    chapter_id: chapterId.value,
                    homework_cid: props.cid,
                    user_id: row.id,
                    score: val,
                },
            })
            if (row.record) row.record.score = String(val)
        } catch (err) {
            scoreMap[row.id] = original
        }
    }

    watch(open, (val) => {
        if (val) fetchRecords()
    })

    // 作业详情弹窗
    const detailOpen = ref(false)
    const detailData = ref<any>(null)

    function openHomeworkDetail(record: any) {
        detailData.value = record
        detailOpen.value = true
    }

    function isRichDoc(content) {
        return content && typeof content === 'object' && !Array.isArray(content) && !!content.type
    }

    return {
        open, rows, pending, extraColumns, defaultSort, scoreMap,
        onScoreBlur, detailOpen, detailData, openHomeworkDetail, isRichDoc,
    }
}
