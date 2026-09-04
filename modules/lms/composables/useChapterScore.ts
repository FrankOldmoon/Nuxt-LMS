import type { Ref } from 'vue'

type TaskItem = {
  id: number
  type: 'question' | 'homework' | 'comment'
  status: string
}

type ScoreRow = {
  userId: number
  score: number
  items: TaskItem[]
  taskStatus: Record<string, boolean>
}

/**
 * 章节得分弹窗逻辑
 * - 拉取班级学生 + 章节得分数据（含每学生 taskStatus）
 * - 用当前章节 headings（来自 useChapterTask）计算每学生 progress
 * - 合并构建表格行（students + scoreData）
 * - 额外列：章节得分 + 任务 + 进度（score / progress 可排序）
 * - 任务预览弹窗状态
 * - 自动刷新：打开后每 2 秒静默拉取最新得分（不置 loading，表格直接替换数据不闪烁）
 */
export function useChapterScore(props: { courseId: number; chapterId: number; classId: number }, isOpen: Ref<boolean>) {
  const { t } = useI18n()
  const { students, fetchUsers } = useClassUsers()

  // 当前章节所有 heading：作为 progress 分母。
  // scoreModal 在章节页打开，useChapterTask() 可拿到（inject 或 sharedChapterTaskCtx）。
  const chapterTask = useChapterTask()
  const headings = computed(() => chapterTask?.taskMap.value.headings ?? [])

  const loading = ref(false)
  const scoreData = ref<ScoreRow[]>([])

  // ---- 任务弹窗状态 ----
  const taskModalOpen = ref(false)
  const taskModalItem = reactive<TaskItem>({ type: 'question', id: 0, status: 'todo' })

  function onItemClick(item: TaskItem) {
    Object.assign(taskModalItem, item)
    taskModalOpen.value = true
  }

  const scoreMap = computed(() => new Map(scoreData.value.map(r => [r.userId, r])))

  // ClassUsersTable 的行数据：合并 students 和 scoreData，并用章节 headings 计算 progress
  const tableRows = computed(() => {
    const hs = headings.value
    const total = hs.length
    return students.value.map(s => {
      const sd = scoreMap.value.get(s.id)
      const taskStatus = sd?.taskStatus ?? {}
      const done = total > 0 ? hs.filter(h => taskStatus[h.id]).length : 0
      return {
        id: s.id,
        name: s.name,
        preferName: s.preferName,
        rollNumber: s.rollNumber,
        username: s.username,
        avatarImg: s.avatarImg,
        score: sd?.score ?? 0,
        items: sd?.items ?? [],
        taskStatus,
        progress: total > 0 ? done / total : 0,
      }
    })
  })

  // 额外列：章节得分 + 任务 + 进度
  // canSort: true → useClassUsersTable 自动补 accessorKey + sortableHeader，排序按数据类型自动选择
  const extraColumns = computed(() => [
    { id: 'score', canSort: true, header: t('chapter.chapterScore') },
    { id: 'task', header: t('chapter.task') },
    { id: 'progress', canSort: true, header: t('chapter.progress') },
  ])

  // silent=true：自动刷新时静默替换数据，不置 loading（避免表格闪烁）
  async function loadData(silent = false) {
    if (!props.chapterId || !props.classId || !props.courseId) return
    if (!silent) loading.value = true
    try {
      // 确保班级用户已加载
      await fetchUsers(props.classId, props.courseId)
      // 获取章节得分（含每学生 taskStatus）
      const data = await cRequest(`/api/chapters/scores?chapterId=${props.chapterId}&classId=${props.classId}&courseId=${props.courseId}`)
      scoreData.value = data || []
    } catch (e) {
      console.error('加载章节得分失败', e)
    } finally {
      if (!silent) loading.value = false
    }
  }

  // ---- 自动轮询：每 2 秒静默刷新一次 ----
  let pollTimer: ReturnType<typeof setInterval> | null = null
  function startPolling() {
    stopPolling()
    pollTimer = setInterval(() => { loadData(true) }, 2000)
  }
  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  watch(isOpen, (val) => {
    if (val) {
      loadData()
      startPolling()
    } else {
      stopPolling()
    }
  })

  onBeforeUnmount(stopPolling)

  return {
    students, loading, scoreData, taskModalOpen, taskModalItem,
    onItemClick, tableRows, extraColumns, loadData,
  }
}