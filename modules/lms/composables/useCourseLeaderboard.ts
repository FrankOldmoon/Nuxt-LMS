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
  const { levelStep } = useLmsPublicConfig()

  const loading = ref(false)
  const scoreRows = ref<any[]>([])

  // 学生信息 map：userId -> LmsClassUser
  const stuMap = computed(() => new Map(students.value.map(s => [s.id, s])))
  const myStudent = computed(() => user.value ? stuMap.value.get(user.value.id) : null)

  // 经验 → 等级（跟随配置的升级曲线）
  const step = computed(() => Number(levelStep.value) || 100)

  // 我的排名（使用后端返回的全程排名，而非前10截断）
  const myRank = ref<{ rank: number, userId: number, score: number, exp: number } | null>(null)
  // 我的等级（跟随配置的升级曲线）
  const myLv = computed(() => expToLevel(myRank.value?.exp ?? 0, step.value))

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
        exp: r.exp ?? 0,
        lv: expToLevel(Number(r.exp) || 0, step.value),
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
        exp: myRank.value?.exp ?? 0,
        lv: expToLevel(myRank.value?.exp ?? 0, step.value),
      })
    }
    return base
  })

  // 额外列：等级 + 总分
  const extraColumns = computed(() => [
    { id: 'lv', header: t('coursePanel.level') },
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
        ? {
            rank: Number(data.myRank),
            userId: data.myInfo.userId,
            score: Number(data.myInfo.score) || 0,
            exp: Number(data.myInfo.exp) || 0,
          }
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
    myLv,
    tableRows,
    extraColumns,
    loadData,
  }
}
