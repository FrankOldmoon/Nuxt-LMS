import type { Ref } from 'vue'

type TaskItem = {
  id: number
  type: 'question' | 'homework' | 'comment'
  status: string
}

/**
 * 章节得分弹窗逻辑
 * - 拉取班级学生 + 章节得分数据
 * - 合并构建表格行（students + scoreData）
 * - 额外列：章节得分 + 任务状态
 * - 任务预览弹窗状态
 */
export function useChapterScore(props: { courseId: number; chapterId: number; classId: number }, isOpen: Ref<boolean>) {
  const { t } = useI18n()
  const { students, fetchUsers } = useClassUsers()

  const loading = ref(false)
  const scoreData = ref<{ userId: number; score: number; items: TaskItem[] }[]>([])

  // ---- 任务弹窗状态 ----
  const taskModalOpen = ref(false)
  const taskModalItem = reactive<TaskItem>({ type: 'question', id: 0, status: 'todo' })

  function onItemClick(item: TaskItem) {
    Object.assign(taskModalItem, item)
    taskModalOpen.value = true
  }

  const scoreMap = computed(() => new Map(scoreData.value.map(r => [r.userId, r])))

  // ClassUsersTable 的行数据：合并 students 和 scoreData
  const tableRows = computed(() => {
    return students.value.map(s => {
      const sd = scoreMap.value.get(s.id)
      return {
        id: s.id,
        name: s.name,
        preferName: s.preferName,
        rollNumber: s.rollNumber,
        avatarImg: s.avatarImg,
        score: sd?.score ?? 0,
        items: sd?.items ?? [],
      }
    })
  })

  // 额外列：章节得分 + 任务状态
  const extraColumns = computed(() => [
    { id: 'score', header: t('chapter.chapterScore') },
    { id: 'tasks', header: t('chapter.tasks') },
  ])

  async function loadData() {
    if (!props.chapterId || !props.classId || !props.courseId) return
    loading.value = true
    try {
      // 确保班级用户已加载
      await fetchUsers(props.classId, props.courseId)
      // 获取章节得分
      const data = await cRequest(`/api/chapters/scores?chapterId=${props.chapterId}&classId=${props.classId}&courseId=${props.courseId}`)
      scoreData.value = data || []
    } catch (e) {
      console.error('加载章节得分失败', e)
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
