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
 * Chapter score modal logic
 * - Fetch class students + chapter score data (includes per-student taskStatus)
 * - Calculate each student's progress using current chapter headings (from useChapterTask)
 * - Merge and build table rows (students + scoreData)
 * - Extra columns: chapter score + task + progress (score / progress are sortable)
 * - Task preview modal state
 */
export function useChapterScore(props: { courseId: number; chapterId: number; classId: number }, isOpen: Ref<boolean>) {
  const { t } = useI18n()
  const { students, fetchUsers } = useClassUsers()

  // All headings of the current chapter: used as the denominator for progress.
  // scoreModal opens on the chapter page, useChapterTask() can retrieve them (inject or sharedChapterTaskCtx).
  const chapterTask = useChapterTask()
  const headings = computed(() => chapterTask?.taskMap.value.headings ?? [])

  const loading = ref(false)
  const scoreData = ref<ScoreRow[]>([])

  // ---- Task modal state ----
  const taskModalOpen = ref(false)
  const taskModalItem = reactive<TaskItem>({ type: 'question', id: 0, status: 'todo' })

  function onItemClick(item: TaskItem) {
    Object.assign(taskModalItem, item)
    taskModalOpen.value = true
  }

  const scoreMap = computed(() => new Map(scoreData.value.map(r => [r.userId, r])))

  // ClassUsersTable row data: merge students and scoreData, and calculate progress using chapter headings
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
        avatarImg: s.avatarImg,
        score: sd?.score ?? 0,
        items: sd?.items ?? [],
        taskStatus,
        progress: total > 0 ? done / total : 0,
      }
    })
  })

  // Extra columns: chapter score + task + progress
  // canSort: true → useClassUsersTable auto-fills accessorKey + sortableHeader, sorting is automatically selected by data type
  const extraColumns = computed(() => [
    { id: 'score', canSort: true, header: t('chapter.chapterScore') },
    { id: 'task', header: t('chapter.task') },
    { id: 'progress', canSort: true, header: t('chapter.progress') },
  ])

  async function loadData() {
    if (!props.chapterId || !props.classId || !props.courseId) return
    loading.value = true
    try {
      // Ensure class users are loaded
      await fetchUsers(props.classId, props.courseId)
      // Fetch chapter scores (includes per-student taskStatus)
      const data = await cRequest(`/api/chapters/scores?chapterId=${props.chapterId}&classId=${props.classId}&courseId=${props.courseId}`)
      scoreData.value = data || []
    } catch (e) {
      console.error('Failed to load chapter scores', e)
    } finally {
      loading.value = false
    }
  }

  watch(isOpen, (val) => {
    if (val) loadData()
  })

  return {
    students, loading, scoreData, taskModalOpen, taskModalItem,
    onItemClick, tableRows, extraColumns, loadData,
  }
}
