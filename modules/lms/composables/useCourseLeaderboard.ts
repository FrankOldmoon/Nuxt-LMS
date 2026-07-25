/**
 * 课程排行榜：加载排行榜数据 + 计算我的排名 + 表格行数据
 */
export function useCourseLeaderboard(
  props: { courseId: string | number; classId: string | number },
  isOpen: Ref<boolean>,
) {
  const { t } = useI18n()
  const { students, fetchUsers } = useClassUsers()
  const { user } = useAuth()

  const loading = ref(false)
  const scoreRows = ref<any[]>([])

  // 学生信息 map：userId -> LmsClassUser
  const stuMap = computed(() => new Map(students.value.map(s => [s.id, s])))
  const myStudent = computed(() => user.value ? stuMap.value.get(user.value.id) : null)

  // 我的排名
  const myRank = computed(() => {
    if (!user.value) return null
    const sorted = [...scoreRows.value].sort((a, b) => (b.score || 0) - (a.score || 0))
    const idx = sorted.findIndex(r => r.userId === user.value!.id)
    if (idx < 0) return null
    return { rank: idx + 1, userId: user.value.id, score: sorted[idx].score || 0 }
  })

  // ClassUsersTable 的行数据：合并 students 和 score
  const tableRows = computed(() => {
    const scoreMap = new Map(scoreRows.value.map(r => [r.userId, r.score || 0]))
    return students.value.map(s => ({
      id: s.id,
      name: s.name,
      preferName: s.preferName,
      rollNumber: s.rollNumber,
      avatarImg: s.avatarImg,
      score: scoreMap.get(s.id) ?? 0,
    }))
  })

  // 额外列：总分
  const extraColumns = computed(() => [
    { id: 'score', header: t('coursePanel.score') },
  ])

  async function loadData() {
    if (!props.courseId) return
    loading.value = true
    try {
      if (props.classId) {
        await fetchUsers(Number(props.classId), Number(props.courseId))
      }
      const params = new URLSearchParams({ courseId: String(props.courseId) })
      if (props.classId) params.set('classId', String(props.classId))
      const data = await cRequest<any>(`/api/courses/leaderboard?${params}`)
      // 用全量 top10 作为行数据（包含所有学生，补0）
      scoreRows.value = data?.top10 || []
    } catch (e) {
      console.error('加载排行榜失败', e)
    } finally {
      loading.value = false
    }
  }

  watch(isOpen, (val) => {
    if (val) loadData()
  })

  return {
    loading,
    scoreRows,
    stuMap,
    myStudent,
    myRank,
    tableRows,
    extraColumns,
    loadData,
  }
}
