import { inject, provide, type InjectionKey, type Ref } from 'vue'

/**
 * Single student learning data composable (student/teacher side share the same context shape)
 *
 * Compatible with useCourseGrades / useGradesContext:
 * - useStudentGradesContext() exposes statCards / radarOption
 * - Keeps the same shape as useGradesContext() in studentStats.vue
 *   → Allows studentStats.vue to be reused under different provide sources
 *
 * Data sources:
 * - /api/courses/grades?courseId&classId   → The student's scores for each item (for radar chart)
 * - /api/courses/stats?courseId&userId    → The student's behavior statistics (for stat cards)
 *
 * Authorization:
 * - /api/courses/stats checks course teacher/admin permissions for userId that is not the current user
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
 * Single student learning data context
 * @param props Course id + student userId
 * @param isOpen Modal open state (for lazy loading)
 */
export function useStudentGrades(
  props: { courseId: number | string; userId: number | string; classId?: number | string },
  isOpen: Ref<boolean>,
) {
  const { t } = useI18n()

  const pending = ref(false)
  const stats = ref({ questionCount: 0, homeworkCount: 0, quizCount: 0, raceCount: 0, commentCount: 0 })
  // The student's scores for this course (filtered by userId)
  const score = ref({
    questionScore: 0,
    homeworkScore: 0,
    quizScore: 0,
    raceScore: 0,
    commentScore: 0,
    marksScore: 0,
    extraScore: 0,
  })

  const statCards = computed(() => [
    { label: t('coursePanel.question'), value: stats.value.questionCount },
    { label: t('coursePanel.homework'), value: stats.value.homeworkCount },
    { label: t('coursePanel.quizScore'), value: stats.value.quizCount },
    { label: t('coursePanel.raceScore'), value: stats.value.raceCount },
    { label: t('coursePanel.comment'), value: stats.value.commentCount },
  ])

  // Radar chart: same shape as useGradesContext().radarOption in studentStats.vue
  const radarOption = computed(() => {
    const dims = [
      { name: t('coursePanel.questionScore'), value: Number(score.value.questionScore) || 0 },
      { name: t('coursePanel.homeworkScore'), value: Number(score.value.homeworkScore) || 0 },
      { name: t('coursePanel.quizScore'), value: Number(score.value.quizScore) || 0 },
      { name: t('coursePanel.commentScore'), value: Number(score.value.commentScore) || 0 },
      { name: t('coursePanel.raceScore'), value: Number(score.value.raceScore) || 0 },
      { name: t('coursePanel.marksScore'), value: Number(score.value.marksScore) || 0 },
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
    const courseId = Number(props.courseId)
    const userId = Number(props.userId)
    const classId = Number(props.classId) || 0
    if (!courseId || !userId) return
    pending.value = true
    try {
      // Load in parallel: behavior stats + grades (grades are provided by /api/courses/grades, including each item score)
      const statsUrl = `/api/courses/stats?courseId=${courseId}&userId=${userId}`
      const gradesUrl = classId
        ? `/api/courses/grades?courseId=${courseId}&classId=${classId}`
        : `/api/courses/grades?courseId=${courseId}`
      const [statsResp, gradesResp] = await Promise.all([
        cRequest(statsUrl).catch(() => null),
        cRequest(gradesUrl).catch(() => null),
      ])
      if (statsResp) stats.value = { ...stats.value, ...statsResp }
      // The grades API may return an array or { grades, gradeCriteria }
      const gradesArr = Array.isArray(gradesResp) ? gradesResp : (gradesResp?.grades ?? [])
      const mine = gradesArr.find((g: any) => Number(g.userId) === userId)
      if (mine) {
        score.value = {
          questionScore: Number(mine.questionScore) || 0,
          homeworkScore: Number(mine.homeworkScore) || 0,
          quizScore: Number(mine.quizScore) || 0,
          raceScore: Number(mine.raceScore) || 0,
          commentScore: Number(mine.commentScore) || 0,
          marksScore: Number(mine.marksScore) || 0,
          extraScore: Number(mine.extraScore) || 0,
        }
      }
    } catch (e) {
      console.error('Failed to load student learning data', e)
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
