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
        // score 行数据无顶层字段（分数在 record.score），用自定义 sortingFn 按真实分数排序
        {
            id: 'score',
            header: t('record.score'),
            canSort: true,
            sortingFn: (a: any, b: any) =>
                (Number(a.original.record?.score) || 0) - (Number(b.original.record?.score) || 0),
        },
        { id: 'comment', header: t('homework.comment'), canSort: false },
        { id: 'excellent', header: t('homework.excellent'), canSort: false },
    ])

    const defaultSort = [{ id: 'record', desc: true }]

    const scoreMap = reactive({})
    const commentMap = reactive({})
    const excellentMap = reactive({})

    function strFromComment(comment: any): string {
        if (comment == null) return ''
        if (typeof comment === 'string') return comment
        if (typeof comment === 'object') return comment.text || ''
        return ''
    }

    // 先用缓存学生数据填充 table，再异步合并 records
    function buildRows(recordsData) {
        const recordMap = new Map((recordsData || []).map(r => [r.userId, r.record]))
        rows.value = students.value.map(s => {
            const record = recordMap.get(s.id) || null
            scoreMap[s.id] = record?.score != null ? Number(record.score) : null
            commentMap[s.id] = record?.comment ? strFromComment(record.comment) : ''
            excellentMap[s.id] = !!record?.excellent
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

    // 一键给满分（保留输入分值）快捷打分
    async function onQuickScore(row, value) {
        scoreMap[row.id] = value
        await onScoreBlur(row)
    }

    // 保存评语（纯文本）
    async function onCommentBlur(row) {
        const text = (commentMap[row.id] || '').trim()
        const original = row.record?.comment ? strFromComment(row.record.comment) : ''
        if (text === original) return
        try {
            await cRequest('/api/homeworks/grade', {
                method: 'POST',
                body: {
                    course_id: props.courseId,
                    homework_cid: props.cid,
                    user_id: row.id,
                    comment: text,
                },
            })
            if (row.record) row.record.comment = text
        } catch {
            commentMap[row.id] = original
        }
    }

    // 标记/取消优秀作业
    async function toggleExcellent(row) {
        const original = !!excellentMap[row.id]
        const next = !original
        excellentMap[row.id] = next
        try {
            await cRequest('/api/homeworks/grade', {
                method: 'POST',
                body: {
                    course_id: props.courseId,
                    homework_cid: props.cid,
                    user_id: row.id,
                    excellent: next,
                },
            })
            if (row.record) row.record.excellent = next
        } catch {
            excellentMap[row.id] = original
        }
    }

    watch(open, (val) => {
      if (val) fetchRecords()
    })

    // 弹窗内切换班级：useClassUsers 全局 students 变化后重建该班记录
    watch(() => students.value, () => fetchRecords())

    // 作业详情弹窗（全屏逐份评阅）
    const detailOpen = ref(false)
    const detailData = ref<any>(null) // 当前评阅的完整行 { id, name, ..., record }
    const detailIndex = ref(0)
    const detailRecord = computed(() => detailData.value?.record ?? null)
    const detailTotal = computed(() => submissions.value.length)
    // 所有已提交的作业（表格行仅含 record 的），用于前后切换
    const submissions = computed(() => rows.value.filter(r => r.record))

    function applyDetail() {
        const len = submissions.value.length
        if (!len) { detailData.value = null; return }
        detailIndex.value = ((detailIndex.value % len) + len) % len
        detailData.value = submissions.value[detailIndex.value]
    }

    function openHomeworkDetail(row) {
        const idx = submissions.value.findIndex(r => r.id === (row?.id ?? row?.userId))
        detailIndex.value = idx >= 0 ? idx : 0
        detailOpen.value = true
        applyDetail()
    }

    function prevSubmission() { detailIndex.value -= 1; applyDetail() }
    function nextSubmission() { detailIndex.value += 1; applyDetail() }

    function closeDetail() {
        detailOpen.value = false
        detailData.value = null
    }

    function isRichDoc(content) {
        return content && typeof content === 'object' && !Array.isArray(content) && !!content.type
    }

    // ==================== 文件预览 ====================
    // 与 /api/files/serve 一致：这些类型可在 iframe 内联预览，其余类型仅提供下载
    const PREVIEWABLE_EXTS = new Set([
        // 图片
        '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico',
        // PDF
        '.pdf',
        // 音频 / 视频
        '.mp3', '.wav', '.mp4', '.webm',
        // 文本 / 代码（服务端以 text/plain 返回）
        '.txt', '.md', '.markdown', '.log', '.csv', '.tsv',
        '.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx',
        '.json', '.json5', '.css', '.scss', '.less', '.sass',
        '.html', '.htm', '.xml', '.yaml', '.yml', '.toml', '.ini', '.conf', '.cfg', '.env', '.properties',
        '.py', '.java', '.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.hxx',
        '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.kts', '.dart', '.lua', '.r', '.scala', '.groovy',
        '.sh', '.bash', '.zsh', '.fish', '.bat', '.cmd', '.ps1',
        '.sql', '.graphql', '.gql', '.proto',
        '.vue', '.svelte', '.astro',
    ])

    /** 从文件 url 提取扩展名（优先 pathname 查询参数） */
    function getFileUrlExt(url: string): string {
        try {
            const u = new URL(url, window.location.origin)
            const p = u.searchParams.get('pathname') || u.pathname
            const clean = decodeURIComponent(p).split('?')[0]
            const ext = clean.split('.').pop()?.toLowerCase() || ''
            return '.' + ext
        } catch {
            return ''
        }
    }

    function isPreviewableFile(url: string): boolean {
        return PREVIEWABLE_EXTS.has(getFileUrlExt(url))
    }

    return {
        open, rows, pending, extraColumns, defaultSort, scoreMap, commentMap, excellentMap,
        fetchRecords, onScoreBlur, onQuickScore, onCommentBlur, toggleExcellent,
        detailOpen, detailData, detailRecord, detailIndex, detailTotal,
        openHomeworkDetail, prevSubmission, nextSubmission, closeDetail,
        isRichDoc, strFromComment, isPreviewableFile,
    }
}