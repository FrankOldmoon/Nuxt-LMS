import { ref, computed, watch, reactive } from 'vue'

export interface HomeworkRecordsProps {
    modelValue: boolean
    courseId: number
    cid: number
    maxScore: number
    /** 作业名称（用于「一键下载全部附件」的压缩包命名） */
    homeworkName?: string
}

export type HomeworkRecordsEmit = (event: 'update:modelValue', value: boolean) => void

export function useHomeworkRecords(props: HomeworkRecordsProps, emit: HomeworkRecordsEmit) {
    const { t } = useI18n()
    const toast = useToast()
    const { students } = useClassUsers()
    const { chapterId } = useLmsContext()

    const open = computed({
        get: () => props.modelValue,
        set: (v) => emit('update:modelValue', v),
    })

    const rows = ref([])
    const pending = ref(false)
    // 一键下载全部附件：打包中状态
    const downloadingAll = ref(false)

    const extraColumns = computed(() => [
        {
            id: 'record',
            header: t('record.colRecord'),
            sortingFn: (a, b) => (hasSubmission(a.original.record) ? 1 : 0) - (hasSubmission(b.original.record) ? 1 : 0),
        },
        // 提交时间：优先取提交时写入的 record._submittedAt，旧数据回退到行创建时间
        {
            id: 'submittedAt',
            header: t('record.submitTime'),
            canSort: true,
            sortingFn: (a: any, b: any) => submittedTs(a.original.record) - submittedTs(b.original.record),
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

    /**
     * 是否为学生真实提交。
     * 教师可为未提交学生打分/写评语，此时会产生「仅评分」行（record/content/files 均为空），
     * 这类行不算提交：详情按钮、标优秀、已提交排序均以本判定为准。
     */
    function hasSubmission(record: any): boolean {
        if (!record) return false
        return record.record != null
            || record.content != null
            || (Array.isArray(record.files) && record.files.length > 0)
    }

    /**
     * 记录的提交时间：优先取提交时写入的 record._submittedAt（重提交会刷新），
     * 历史数据（改造前）没有该字段，回退到行创建时间 createdAt。
     */
    function submittedAtOf(record: any): string | null {
        if (!record) return null
        return record.record?._submittedAt || record.createdAt || null
    }

    /** 提交时间转时间戳（用于排序，缺失/非法按 0 处理） */
    function submittedTs(record: any): number {
        const v = submittedAtOf(record)
        if (!v) return 0
        const ms = new Date(v).getTime()
        return Number.isNaN(ms) ? 0 : ms
    }

    /** 本地补一个记录对象：未提交学生首次保存打分/评语后，表格需即时反映 */
    function ensureRecord(row: any) {
        if (!row.record) {
            row.record = {
                userId: row.id,
                courseId: props.courseId,
                homeworkCid: props.cid,
                score: null,
                comment: null,
                content: null,
                files: null,
                record: null,
                excellent: false,
            }
        }
        return row.record
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
                avatarFrame: s.avatarFrame,
                record,
            }
        })
        rows.value.sort((a, b) => {
            const aHas = hasSubmission(a.record) ? 1 : 0
            const bHas = hasSubmission(b.record) ? 1 : 0
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

    /** 打分上限（homework 满分），用于输入框与保存时的边界钳制 */
    const maxScoreValue = computed(() => Number(props.maxScore) || 0)

    /** 将分数钳制到 [0, 满分]；空值返回 null（表示未设置） */
    function clampScore(value: any): number | null {
        if (value === null || value === undefined || value === '') return null
        let n = Number(value)
        if (!Number.isFinite(n)) return null
        if (n < 0) n = 0
        const max = maxScoreValue.value
        if (max > 0 && n > max) n = max
        return n
    }

    // 保存打分
    async function onScoreBlur(row) {
        const raw = scoreMap[row.id]
        const val = clampScore(raw)
        // 超出范围的输入即时回显钳制后的值，给用户反馈
        if (val !== null && Number(raw) !== val) scoreMap[row.id] = val
        if (val === null) return
        const original = row.record?.score != null ? Number(row.record.score) : null
        if (original === val) return

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
            else ensureRecord(row).score = String(val)
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
            else ensureRecord(row).comment = text
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
    // 提交时间：优先取提交时写入的 record._submittedAt（重提交会刷新），旧数据回退到行创建时间
    const detailSubmittedAt = computed(() => submittedAtOf(detailRecord.value))
    const detailTotal = computed(() => submissions.value.length)
    // 所有已提交的作业（表格行仅含真实提交的），用于前后切换
    const submissions = computed(() => rows.value.filter(r => hasSubmission(r.record)))

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

    // ==================== 一键下载全部附件 ====================
    /** 归一化 record.files → url 字符串数组（兼容 [{url}] 与字符串两种历史格式） */
    function attachmentUrls(record: any): string[] {
        const files = record?.files
        if (!Array.isArray(files)) return []
        return files.map((f: any) => (typeof f === 'string' ? f : f?.url)).filter(Boolean)
    }

    /** 压缩包内的路径片段清洗：去掉非法字符，避免跨目录 */
    function safeSegment(name: string): string {
        return String(name || '')
            .replace(/[\\/:*?"<>|]/g, '_')
            .replace(/\s+/g, ' ')
            .trim() || 'unknown'
    }

    /** 解析附件的原始文件名：优先 /api/files/meta，失败回退 url 解析 */
    async function resolveFileName(url: string): Promise<string> {
        try {
            const u = new URL(url, window.location.origin)
            const pathname = u.searchParams.get('pathname')
            if (pathname) {
                const data = await cRequest(`/api/files/meta?pathname=${encodeURIComponent(pathname)}`)
                if (data?.name) return data.name
            }
        } catch { /* 忽略，回退 */ }
        return getFileNameFromUrl(url)
    }

    /** 同一目录内重名时追加 (n) 后缀 */
    function uniqueName(name: string, used: Set<string>): string {
        if (!used.has(name)) return name
        const dot = name.lastIndexOf('.')
        const base = dot > 0 ? name.slice(0, dot) : name
        const ext = dot > 0 ? name.slice(dot) : ''
        let n = 1
        let candidate = `${base}(${n})${ext}`
        while (used.has(candidate)) {
            n += 1
            candidate = `${base}(${n})${ext}`
        }
        return candidate
    }

    /** 是否为「外部链接」（非本站文件）：本站上传文件走 /api/files/*，其它一律视为外链 */
    function isExternalLink(url: string): boolean {
        try {
            const u = new URL(url, window.location.origin)
            // 本站文件：/api/files/serve 等
            return !u.pathname.startsWith('/api/files/')
        } catch {
            return false
        }
    }

    /** 外部链接 → 可双击打开的 .url 快捷方式内容（Windows InternetShortcut） */
    function urlShortcutContent(url: string): string {
        return `[InternetShortcut]\r\nURL=${url}\r\n`
    }

    /**
     * 一键下载所有学生的作业附件：按「学生」分文件夹打包为 zip。
     * 单个文件下载失败会跳过，不影响整体；全部失败则提示。
     */
    async function downloadAllFiles() {
        if (downloadingAll.value) return
        const groups = rows.value
            .filter(r => hasSubmission(r.record))
            .map(r => ({
                name: safeSegment(r.preferName || r.name || r.username || `user-${r.id}`),
                files: attachmentUrls(r.record),
            }))
            .filter(g => g.files.length > 0)

        if (!groups.length) {
            toast.add({ title: t('record.noAttachments'), color: 'warning' })
            return
        }

        downloadingAll.value = true
        try {
            const JSZip = (await import('jszip')).default
            const zip = new JSZip()
            let total = 0
            let saved = 0
            // 同名学生在同一班级内理论上不会出现，仍做去重避免覆盖
            const usedFolders = new Set<string>()

            for (const group of groups) {
                const folderName = uniqueName(group.name, usedFolders)
                usedFolders.add(folderName)
                const folder = zip.folder(folderName)!
                const usedNames = new Set<string>()
                for (const url of group.files) {
                    total += 1
                    // 外部链接：不实际下载（跨域/不可达），改为生成可双击打开的 .url 快捷方式
                    if (isExternalLink(url)) {
                        try {
                            const rawName = safeSegment(getFileNameFromUrl(url)) || 'link'
                            let fileName = rawName.toLowerCase().endsWith('.url') ? rawName : `${rawName}.url`
                            fileName = uniqueName(fileName, usedNames)
                            usedNames.add(fileName)
                            folder.file(fileName, urlShortcutContent(url))
                            saved += 1
                        } catch { /* 单个链接失败跳过 */ }
                        continue
                    }
                    try {
                        const resp = await fetch(url)
                        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
                        const blob = await resp.blob()
                        const rawName = await resolveFileName(url)
                        const fileName = uniqueName(safeSegment(rawName), usedNames)
                        usedNames.add(fileName)
                        folder.file(fileName, blob)
                        saved += 1
                    } catch { /* 单个附件失败跳过 */ }
                }
            }

            if (!saved) {
                toast.add({ title: t('record.downloadAllFailed'), color: 'error' })
                return
            }

            const blob = await zip.generateAsync({ type: 'blob' })
            const stamp = new Date().toISOString().slice(0, 10)
            const prefix = safeSegment(props.homeworkName || `homework-${props.cid}`)
            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)
            link.download = `${prefix}-attachments-${stamp}.zip`
            document.body.appendChild(link)
            link.click()
            link.remove()
            setTimeout(() => URL.revokeObjectURL(link.href), 1000)
            toast.add({ title: t('record.downloadAllDone', { saved, total }), color: 'success' })
        } catch {
            toast.add({ title: t('record.downloadAllFailed'), color: 'error' })
        } finally {
            downloadingAll.value = false
        }
    }

    // ==================== 一键全部满分 ====================
    const scoringAll = ref(false)

    /**
     * 给所有「已提交作业」的学生一键打满分（maxScore）。
     * - 已是满分的行跳过（避免无意义的重复请求）
     * - 单个学生失败不影响整体；全部失败则提示
     */
    async function scoreAllSubmitted() {
        if (scoringAll.value) return
        const max = Number(props.maxScore) || 0
        if (max <= 0) {
            toast.add({ title: t('record.scoreAllInvalidMax'), color: 'warning' })
            return
        }
        const targets = rows.value.filter(r =>
            hasSubmission(r.record) && Number(scoreMap[r.id]) !== max,
        )
        if (!targets.length) {
            toast.add({ title: t('record.scoreAllNone'), color: 'warning' })
            return
        }

        scoringAll.value = true
        let ok = 0
        try {
            for (const row of targets) {
                try {
                    await cRequest('/api/homeworks/score', {
                        method: 'POST',
                        body: {
                            course_id: props.courseId,
                            chapter_id: chapterId.value,
                            homework_cid: props.cid,
                            user_id: row.id,
                            score: max,
                        },
                    })
                    scoreMap[row.id] = max
                    if (row.record) row.record.score = String(max)
                    else ensureRecord(row).score = String(max)
                    ok += 1
                } catch { /* 单个失败跳过 */ }
            }
            if (ok > 0) {
                toast.add({ title: t('record.scoreAllDone', { n: ok }), color: 'success' })
            } else {
                toast.add({ title: t('record.scoreAllFailed'), color: 'error' })
            }
        } finally {
            scoringAll.value = false
        }
    }

    return {
        open, rows, pending, extraColumns, defaultSort, scoreMap, commentMap, excellentMap,
        fetchRecords, onScoreBlur, onQuickScore, onCommentBlur, toggleExcellent,
        downloadingAll, downloadAllFiles,
        scoringAll, scoreAllSubmitted,
        detailOpen, detailData, detailRecord, detailSubmittedAt, detailIndex, detailTotal,
        openHomeworkDetail, prevSubmission, nextSubmission, closeDetail,
        isRichDoc, strFromComment, hasSubmission, submittedAtOf, isPreviewableFile,
    }
}