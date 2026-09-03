import { ref, computed, watch } from 'vue'

export interface CommentRecordsProps {
    modelValue: boolean
    courseId: number
    cid: number
}

export type CommentRecordsEmit = (event: 'update:modelValue', value: boolean) => void

export function useCommentRecords(props: CommentRecordsProps, emit: CommentRecordsEmit) {
    const { t } = useI18n()
    const { students } = useClassUsers()

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
    }])

    const defaultSort = [{ id: 'record', desc: true }]

    // 先用缓存学生数据填充 table，再异步合并 records
    function buildRows(recordsData: any[]) {
        const recordMap = new Map((recordsData || []).map(r => [r.userId, r.record]))
        rows.value = students.value.map(s => ({
            id: s.id,
            name: s.name,
            preferName: s.preferName,
            rollNumber: s.rollNumber,
            username: s.username,
            avatarImg: s.avatarImg,
            record: recordMap.get(s.id) || null,
        }))
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
            const data = await cRequest(`/api/comments/records?course_id=${props.courseId}&cid=${props.cid}`)
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

    return { open, rows, pending, extraColumns, defaultSort }
}
