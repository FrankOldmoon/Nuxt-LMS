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

// ====================== 评分标准默认值 ======================
// grade_criteria 为空时的初始值：每项分满分(maxScore) + 占比(percent)，百分比之和应为 100
// 等第阈值按百分制换算：finalScore = Σ( subscore / maxScore × percent )
const DEFAULT_PERCENTS: Record<string, number> = {
  questionScore: 20,
  homeworkScore: 20,
  quizScore: 20,
  raceScore: 10,
  commentScore: 10,
  marksScore: 20,
  extraScore: 0,
}

export const GRADE_WEIGHT_KEYS = [
  'questionScore', 'homeworkScore', 'quizScore',
  'raceScore', 'commentScore', 'marksScore', 'extraScore',
] as const

export const DEFAULT_GRADE_CRITERIA = {
  weights: GRADE_WEIGHT_KEYS.map(key => ({ key, maxScore: 100, percent: DEFAULT_PERCENTS[key] })),
  levels: [
    { letter: 'A', min: 90 },
    { letter: 'B', min: 80 },
    { letter: 'C', min: 70 },
    { letter: 'D', min: 60 },
  ],
}

/** 规范化 grade_criteria：补全缺失字段，兼容历史/部分数据 */
function normalizeCriteria(raw: any) {
  if (!raw || typeof raw !== 'object') return JSON.parse(JSON.stringify(DEFAULT_GRADE_CRITERIA))
  const weights = Array.isArray(raw.weights)
    ? GRADE_WEIGHT_KEYS.map(key => {
      const found = raw.weights.find((w: any) => w?.key === key)
      return {
        key,
        maxScore: Number(found?.maxScore ?? 100) || 0,
        percent: Number(found?.percent ?? DEFAULT_PERCENTS[key]) || 0,
      }
    })
    : GRADE_WEIGHT_KEYS.map(key => ({ key, maxScore: 100, percent: DEFAULT_PERCENTS[key] }))
  const levels = Array.isArray(raw.levels) && raw.levels.length > 0
    ? raw.levels.map((l: any) => ({ letter: String(l?.letter ?? ''), min: Number(l?.min ?? 0) || 0 }))
      .sort((a: any, b: any) => b.min - a.min)
    : JSON.parse(JSON.stringify(DEFAULT_GRADE_CRITERIA.levels))
  return { weights, levels }
}

/** 根据分数与等第阈值换算字母等级 */
function letterForScore(score: number, levels: { letter: string; min: number }[]) {
  if (!levels || levels.length === 0) return '-'
  const sorted = [...levels].sort((a, b) => b.min - a.min)
  return sorted.find(l => score >= l.min)?.letter || sorted[sorted.length - 1]?.letter || 'F'
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
  const toast = useToast()

  // 是否可编辑（教师或管理员）
  const canEdit = computed(() => {
    if (auth.hasRole('admin')) return true
    return props.courseId ? auth.isCourseTeacher(Number(props.courseId)) : false
  })

  const rows = ref<any[]>([])
  const pending = ref(false)

  // 评分标准：grade_criteria（null 时使用默认值）
  const gradeCriteria = ref<any>(JSON.parse(JSON.stringify(DEFAULT_GRADE_CRITERIA)))
  const effectiveCriteria = computed(() => normalizeCriteria(gradeCriteria.value))
  const criteriaDirty = ref(false)

  /** 根据行数据计算等第：最终分 + 字母等级
   *  finalScore = Σ( subscore / maxScore × percent )，按百分制归一化后对照等第阈值 */
  function computeGrade(row: any) {
    const crit = effectiveCriteria.value
    const finalScore = crit.weights.reduce((sum: number, w: any) => {
      const max = Number(w.maxScore) || 0
      if (max <= 0) return sum
      const subscore = Number(row?.[w.key]) || 0
      return sum + (subscore / max) * (Number(w.percent) || 0)
    }, 0)
    return {
      letter: letterForScore(finalScore, crit.levels),
      finalScore,
    }
  }

  // 额外列定义：group + grade(字母) + total(最终分) + progress(通过比) + 各项分数 + extraScore
  const extraColumns = computed(() => [
    {
      id: 'group',
      header: t('coursePanel.group'),
      sortingFn: (a: any, b: any) => String(a.original.group || '').localeCompare(String(b.original.group || '')),
    },
    {
      id: 'grade',
      header: t('coursePanel.grade'),
      sortingFn: (a: any, b: any) => {
        const ga = computeGrade(a.original).finalScore
        const gb = computeGrade(b.original).finalScore
        return gb - ga
      },
    },
    {
      id: 'total',
      header: t('coursePanel.total'),
      sortingFn: (a: any, b: any) => {
        const ga = computeGrade(a.original).finalScore
        const gb = computeGrade(b.original).finalScore
        return gb - ga
      },
    },
    {
      id: 'progress',
      header: t('coursePanel.progress'),
      sortingFn: (a: any, b: any) => (b.original.progress ?? 0) - (a.original.progress ?? 0),
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
      id: 'extraScore',
      header: t('coursePanel.extraScore'),
      sortingFn: (a: any, b: any) => (b.original.extraScore ?? 0) - (a.original.extraScore ?? 0),
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
        extraScore: g?.extraScore ?? 0,
        progress: g?.progress ?? 0,
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
      // grades API 返回 { grades, gradeCriteria }
      const grades = Array.isArray(raw) ? raw : (raw?.grades ?? [])
      const criteria = Array.isArray(raw) ? null : raw?.gradeCriteria
      buildRows(grades)
      // 加载评分标准
      gradeCriteria.value = normalizeCriteria(criteria)
      criteriaDirty.value = false
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

  // 保存评分标准到 course.grade_criteria
  async function saveCriteria() {
    if (!props.courseId) return
    try {
      await cRequest('/api/courses/update', {
        method: 'POST',
        body: { id: Number(props.courseId), gradeCriteria: effectiveCriteria.value },
      })
      gradeCriteria.value = JSON.parse(JSON.stringify(effectiveCriteria.value))
      criteriaDirty.value = false
      toast.add({ title: t('coursePanel.criteriaSaved'), color: 'success' })
    } catch (e: any) {
      console.error('保存评分标准失败', e)
      toast.add({ title: t('coursePanel.criteriaSaveFailed'), color: 'error' })
    }
  }

  // 重置为默认评分标准
  function resetCriteria() {
    gradeCriteria.value = JSON.parse(JSON.stringify(DEFAULT_GRADE_CRITERIA))
    criteriaDirty.value = true
  }

  // 教师保存单个学生的额外分
  const extraScoreSaving = ref<number | null>(null)
  async function saveExtraScore(userId: number, extraScore: number) {
    if (!props.courseId) return
    extraScoreSaving.value = userId
    try {
      await cRequest('/api/courses/extra-score', {
        method: 'POST',
        body: { course_id: Number(props.courseId), user_id: userId, extra_score: extraScore },
      })
      // 同步更新本地行数据
      const row = rows.value.find((r: any) => r.id === userId)
      if (row) row.extraScore = extraScore
      toast.add({ title: t('coursePanel.saveSuccess'), color: 'success' })
    } catch (e: any) {
      console.error('保存额外分失败', e)
      toast.add({ title: t('coursePanel.saveFailed'), color: 'error' })
    } finally {
      extraScoreSaving.value = null
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
    gradeCriteria,
    effectiveCriteria,
    criteriaDirty,
    computeGrade,
    saveCriteria,
    resetCriteria,
    saveExtraScore,
    extraScoreSaving,
  }
}
