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

  // 我的排名（使用后端返回的全程排名，而非前10截断）
  const myRank = ref<{ rank: number, userId: number, score: number } | null>(null)

  // 排行榜表格行：前10名 + （自己不在前10时）自己的行
  const tableRows = computed(() => {
    const base = scoreRows.value.map((r) => {
      const s = stuMap.value.get(r.userId)
      return {
        id: r.userId,
        name: s?.name || `User ${r.userId}`,
        preferName: s?.preferName,
        rollNumber: s?.rollNumber,
        username: s?.username,
        avatarImg: s?.avatarImg,
        score: r.score ?? 0,
      }
    })
    // 自己不在前10时，在末尾追加自己的行（顶部"我的名次"卡片仍显示全程排名）
    if (user.value && !scoreRows.value.some(r => r.userId === user.value!.id)) {
      const s = stuMap.value.get(user.value.id)
      base.push({
        id: user.value.id,
        name: s?.name || user.value.name || `User ${user.value.id}`,
        preferName: s?.preferName,
        rollNumber: s?.rollNumber,
        username: s?.username,
        avatarImg: s?.avatarImg,
        score: myRank.value?.score ?? 0,
      })
    }
    return base
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
      // 前10名作为表格行
      scoreRows.value = data?.top10 || []
      // 我的全程排名（来自后端）
      myRank.value = (data?.myRank != null && data?.myInfo)
        ? { rank: Number(data.myRank), userId: data.myInfo.userId, score: Number(data.myInfo.score) || 0 }
        : null
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
