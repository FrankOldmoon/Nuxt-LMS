import { inject, provide, type InjectionKey, type Ref } from 'vue'

/**
 * 单个学生的学习数据 composable（学生端 / 教师端共用同一上下文形状）
 *
 * 与 useCourseGrades / useGradesContext 兼容：
 * - useStudentGradesContext() 暴露 statCards / radarOption
 * - 与 studentStats.vue 内 useGradesContext() 的形状保持一致
 *   → 让 studentStats.vue 能在不同 provide 源下被复用
 *
 * 数据源：
 * - /api/courses/grades?courseId&classId   → 该学生各项分数（用于雷达图）
 * - /api/courses/stats?courseId&userId    → 该学生行为统计（用于统计卡片）
 *
 * 鉴权：
 * - /api/courses/stats 会对非自己的 userId 校验课程教师/管理员权限
 */
const StudentGradesKey = Symbol('StudentGrades') as InjectionKey<ReturnType<typeof useStudentGrades>>

export function provideStudentGrades(ctx: ReturnType<typeof useStudentGrades>) {
  provide(StudentGradesKey, ctx)
}

export function useStudentGradesContext() {
  const ctx = inject(StudentGradesKey)
  if (!ctx) throw new Error('useStudentGradesContext must be used within studentStatsModal')
  return ctx
}

/**
 * 单个学生的学习数据上下文
 * @param props 课程 id + 学生 userId
 * @param isOpen 弹窗打开状态（用于懒加载）
 */
export function useStudentGrades(
  props: { courseId: number | string; userId: number | string; classId?: number | string },
  isOpen: Ref<boolean>,
) {
  const { t } = useI18n()

  const pending = ref(false)
  const stats = ref({ questionCount: 0, homeworkCount: 0, quizCount: 0, raceCount: 0, commentCount: 0 })
  // 该学生该课程的成绩（按 userId 过滤）
  const score = ref({
    questionScore: 0,
    homeworkScore: 0,
    quizScore: 0,
    raceScore: 0,
    commentScore: 0,
    altitudeScore: 0,
    externalScore: 0,
  })

  const statCards = computed(() => [
    { label: t('coursePanel.question'), value: stats.value.questionCount },
    { label: t('coursePanel.homework'), value: stats.value.homeworkCount },
    { label: t('coursePanel.quizScore'), value: stats.value.quizCount },
    { label: t('coursePanel.raceScore'), value: stats.value.raceCount },
    { label: t('coursePanel.comment'), value: stats.value.commentCount },
  ])

  // 雷达图：与 studentStats.vue 中 useGradesContext().radarOption 形状一致
  const radarOption = computed(() => {
    const dims = [
      { name: t('coursePanel.questionScore'), value: Number(score.value.questionScore) || 0 },
      { name: t('coursePanel.homeworkScore'), value: Number(score.value.homeworkScore) || 0 },
      { name: t('coursePanel.quizScore'), value: Number(score.value.quizScore) || 0 },
      { name: t('coursePanel.commentScore'), value: Number(score.value.commentScore) || 0 },
      { name: t('coursePanel.raceScore'), value: Number(score.value.raceScore) || 0 },
      { name: t('coursePanel.altitudeScore'), value: Number(score.value.altitudeScore) || 0 },
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
    // props.courseId/userId/classId 可能由调用方传入 ref/computed，toValue 统一解包
    const courseId = Number(toValue(props.courseId))
    const userId = Number(toValue(props.userId))
    const classId = Number(toValue(props.classId)) || 0
    console.log('[DEBUG useStudentGrades] loadData 触发: isOpen=', isOpen.value, 'courseId=', courseId, 'userId=', userId, 'classId=', classId)
    if (!courseId || !userId) {
      console.log('[DEBUG useStudentGrades] ❌ 提前 return（缺少 courseId 或 userId）', { courseId, userId })
      return
    }
    pending.value = true
    try {
      // 并行加载：行为统计 + 成绩（成绩由 /api/courses/grades 提供，含各项分）
      const statsUrl = `/api/courses/stats?courseId=${courseId}&userId=${userId}`
      const gradesUrl = classId
        ? `/api/courses/grades?courseId=${courseId}&classId=${classId}`
        : `/api/courses/grades?courseId=${courseId}`
      const [statsResp, gradesResp] = await Promise.all([
        cRequest(statsUrl).catch(() => null),
        cRequest(gradesUrl).catch(() => null),
      ])
      console.log('[DEBUG useStudentGrades] 请求返回: statsResp=', statsResp, 'gradesResp=', gradesResp)
      if (statsResp) stats.value = { ...stats.value, ...statsResp }
      // grades 接口可能返回数组或 { grades, gradeCriteria }
      const gradesArr = Array.isArray(gradesResp) ? gradesResp : (gradesResp?.grades ?? [])
      const mine = gradesArr.find((g: any) => Number(g.userId) === userId)
      if (mine) {
        score.value = {
          questionScore: Number(mine.questionScore) || 0,
          homeworkScore: Number(mine.homeworkScore) || 0,
          quizScore: Number(mine.quizScore) || 0,
          raceScore: Number(mine.raceScore) || 0,
          commentScore: Number(mine.commentScore) || 0,
          altitudeScore: Number(mine.altitudeScore) || 0,
          externalScore: Number(mine.externalScore) || 0,
        }
      }
    } catch (e) {
      console.error('加载学生学习数据失败', e)
    } finally {
      pending.value = false
    }
  }

  watch(isOpen, (val) => {
    if (val) loadData()
  }, { immediate: true })

  return {
    pending,
    stats,
    score,
    statCards,
    radarOption,
    loadData,
  }
}
