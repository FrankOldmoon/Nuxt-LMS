/**
 * Course leaderboard: load leaderboard data + compute my rank + table row data
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

  // Student info map: userId -> LmsClassUser
  const stuMap = computed(() => new Map(students.value.map(s => [s.id, s])))
  const myStudent = computed(() => user.value ? stuMap.value.get(user.value.id) : null)

  // My rank
  const myRank = computed(() => {
    if (!user.value) return null
    const sorted = [...scoreRows.value].sort((a, b) => (b.score || 0) - (a.score || 0))
    const idx = sorted.findIndex(r => r.userId === user.value!.id)
    if (idx < 0) return null
    return { rank: idx + 1, userId: user.value.id, score: sorted[idx].score || 0 }
  })

  // ClassUsersTable row data: merge students and score
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

  // Extra column: total score
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
      // Use full top10 as row data (include all students, fill 0)
      scoreRows.value = data?.top10 || []
    } catch (e) {
      console.error('Failed to load leaderboard', e)
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
