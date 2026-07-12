import { inject, provide, type InjectionKey } from 'vue'

const GradesKey = Symbol('Grades') as InjectionKey<ReturnType<typeof useCourseGrades>>

export function provideGrades(ctx: ReturnType<typeof useCourseGrades>) {
  provide(GradesKey, ctx)
}

export function useGradesContext() {
  const ctx = inject(GradesKey)
  if (!ctx) throw new Error('useGradesContext must be used within gradesModal')
  return ctx
}

/**
 * 课程成绩弹窗：合并学生与成绩数据、表格列定义、学生端学习统计与能力雷达图
 */
export function useCourseGrades(
  props: { courseId: string | number; classId: string | number },
  isOpen: Ref<boolean>,
) {
  const { t } = useI18n()
  const { students, fetchUsers } = useClassUsers()
  const auth = useAuth()

  // 是否可编辑（教师或管理员）
  const canEdit = computed(() => {
    if (auth.hasRole('admin')) return true
    return props.courseId ? auth.isCourseTeacher(Number(props.courseId)) : false
  })

  const rows = ref<any[]>([])
  const pending = ref(false)

  // 额外列定义：group + 各项分数
  const extraColumns = computed(() => [
    {
      id: 'group',
      header: t('coursePanel.group'),
      sortingFn: (a: any, b: any) => String(a.original.group || '').localeCompare(String(b.original.group || '')),
    },
    {
      id: 'total',
      header: t('coursePanel.total'),
      sortingFn: (a: any, b: any) => (b.original.score ?? 0) - (a.original.score ?? 0),
    },
    {
      id: 'questionScore',
      header: t('coursePanel.questionScore'),
      sortingFn: (a: any, b: any) => (b.original.questionScore ?? 0) - (a.original.questionScore ?? 0),
    },
    {
      id: 'homeworkScore',
      header: t('coursePanel.homeworkScore'),
      sortingFn: (a: any, b: any) => (b.original.homeworkScore ?? 0) - (a.original.homeworkScore ?? 0),
    },
    {
      id: 'quizScore',
      header: t('coursePanel.quizScore'),
      sortingFn: (a: any, b: any) => (b.original.quizScore ?? 0) - (a.original.quizScore ?? 0),
    },
    {
      id: 'raceScore',
      header: t('coursePanel.raceScore'),
      sortingFn: (a: any, b: any) => (b.original.raceScore ?? 0) - (a.original.raceScore ?? 0),
    },
    {
      id: 'commentScore',
      header: t('coursePanel.commentScore'),
      sortingFn: (a: any, b: any) => (b.original.commentScore ?? 0) - (a.original.commentScore ?? 0),
    },
    {
      id: 'marksScore',
      header: t('coursePanel.marksScore'),
      sortingFn: (a: any, b: any) => (b.original.marksScore ?? 0) - (a.original.marksScore ?? 0),
    },
    {
      id: 'exp',
      header: t('coursePanel.exp'),
      sortingFn: (a: any, b: any) => (b.original.exp ?? 0) - (a.original.exp ?? 0),
    },
  ])

  const defaultSort = [{ id: 'total', desc: true }]

  // 先用缓存学生数据立即显示（无成绩），再异步合并成绩
  function buildRows(rawData: any[]) {
    const gradeMap = new Map((rawData || []).map((r) => [r.userId, r]))
    let allRows = students.value.map((s: any) => {
      const g = gradeMap.get(s.id)
      return {
        id: s.id,
        name: s.name,
        preferName: s.preferName,
        rollNumber: s.rollNumber,
        avatarImg: s.avatarImg,
        group: g?.group || '',
        score: g?.score ?? 0,
        questionScore: g?.questionScore ?? 0,
        homeworkScore: g?.homeworkScore ?? 0,
        quizScore: g?.quizScore ?? 0,
        raceScore: g?.raceScore ?? 0,
        commentScore: g?.commentScore ?? 0,
        marksScore: g?.marksScore ?? 0,
        exp: g?.exp ?? 0,
        _hasGrade: !!g,
      }
    })
    // 学生只能看自己的那一行
    if (!canEdit.value) {
      const uid = auth.user.value?.id
      allRows = allRows.filter((r: any) => r.id === uid)
    }
    rows.value = allRows.sort((a: any, b: any) => b.score - a.score)
  }

  // 学生端：学习数据统计
  const stats = ref({ questionCount: 0, homeworkCount: 0, quizCount: 0, raceCount: 0, commentCount: 0 })
  async function loadStats() {
    try {
      const data = await cRequest(`/api/courses/stats?courseId=${props.courseId}`)
      if (data) stats.value = data
    } catch (e) {
      /* 静默 */
    }
  }
  const statCards = computed(() => [
    { label: t('coursePanel.question'), value: stats.value.questionCount },
    { label: t('coursePanel.homework'), value: stats.value.homeworkCount },
    { label: t('coursePanel.quizScore'), value: stats.value.quizCount },
    { label: t('coursePanel.raceScore'), value: stats.value.raceCount },
    { label: t('coursePanel.comment'), value: stats.value.commentCount },
  ])

  // 学生端：能力雷达图（用各项 score 作为能力维度）
  const radarOption = computed(() => {
    const r = rows.value[0]
    if (!r) return {}
    const dims = [
      { name: t('coursePanel.questionScore'), value: Number(r.questionScore) || 0 },
      { name: t('coursePanel.homeworkScore'), value: Number(r.homeworkScore) || 0 },
      { name: t('coursePanel.quizScore'), value: Number(r.quizScore) || 0 },
      { name: t('coursePanel.commentScore'), value: Number(r.commentScore) || 0 },
      { name: t('coursePanel.raceScore'), value: Number(r.raceScore) || 0 },
      { name: t('coursePanel.marksScore'), value: Number(r.marksScore) || 0 },
    ]
    const peak = Math.max(...dims.map((d) => d.value), 10)
    const maxVal = Math.ceil((peak * 1.2) / 10) * 10
    return {
      tooltip: {},
      radar: {
        indicator: dims.map((d) => ({ name: d.name, max: maxVal })),
        radius: '60%',
        splitNumber: 4,
      },
      series: [{
        type: 'radar',
        data: [{
          value: dims.map((d) => d.value),
          name: t('coursePanel.ability'),
          areaStyle: { opacity: 0.2 },
          lineStyle: { width: 2 },
        }],
      }],
    }
  })

  async function loadData() {
    if (!props.courseId) return
    // 先用缓存学生数据立即显示
    buildRows([])
    pending.value = true
    try {
      // 确保班级用户已加载
      if (props.classId) {
        await fetchUsers(Number(props.classId), Number(props.courseId))
        buildRows([])
      }
      const params = new URLSearchParams({ courseId: String(props.courseId) })
      if (props.classId) params.set('classId', String(props.classId))
      const raw = await cRequest(`/api/courses/grades?${params}`)
      buildRows(raw)
      // 学生端额外加载学习数据
      if (!canEdit.value) {
        await loadStats()
      }
    } catch (e) {
      console.error('加载成绩失败', e)
    } finally {
      pending.value = false
    }
  }

  watch(isOpen, (val) => {
    if (val) loadData()
  })

  return {
    rows,
    pending,
    extraColumns,
    defaultSort,
    buildRows,
    stats,
    statCards,
    radarOption,
    loadData,
    canEdit,
  }
}
