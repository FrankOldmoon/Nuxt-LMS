/**
 * useStudentGrades composable 测试
 * @see modules/lms/composables/useStudentGrades.ts
 *
 * 覆盖：
 * - 初始状态：空 stats / 空 score
 * - open=true 触发 loadData：并行请求 stats 和 grades
 * - 当 grades 数组中找不到 userId 时，score 保持 0
 * - 加载过程中 pending 切换
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import {
  resetAllStubs,
  setMockI18n,
  setMockFetchHandler,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
})

describe('composables/useStudentGrades', () => {
  it('初始状态：空 stats + score 全 0', async () => {
    const { useStudentGrades } = await import('../../composables/useStudentGrades')
    const isOpen = ref(false)
    const r = useStudentGrades({ courseId: 1, userId: 1 }, isOpen)
    expect(r.pending.value).toBe(false)
    expect(r.stats.value.questionCount).toBe(0)
    expect(r.score.value.questionScore).toBe(0)
    expect(r.score.value.marksScore).toBe(0)
    expect(r.statCards.value.length).toBe(5)
    expect(r.radarOption.value).toHaveProperty('radar')
  })

  it('open=true 触发 loadData 并写入 stats + score', async () => {
    setMockFetchHandler(async (url: string) => {
      if (String(url).includes('/api/courses/stats')) {
        return { data: { questionCount: 7, homeworkCount: 3, quizCount: 2, raceCount: 1, commentCount: 4 }, success: true, msg: '' }
      }
      if (String(url).includes('/api/courses/grades')) {
        return {
          data: {
            grades: [
              { userId: 1, questionScore: 80, homeworkScore: 70, quizScore: 90, raceScore: 50, commentScore: 60, marksScore: 85, extraScore: 5 },
              { userId: 2, questionScore: 30, homeworkScore: 40, quizScore: 50, raceScore: 10, commentScore: 20, marksScore: 25, extraScore: 0 },
            ],
          },
          success: true,
          msg: '',
        }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useStudentGrades } = await import('../../composables/useStudentGrades')
    const isOpen = ref(true)
    const r = useStudentGrades({ courseId: 1, userId: 1 }, isOpen)
    // wait for the watch + loadData microtasks
    await new Promise(res => setTimeout(res, 0))
    expect(r.stats.value.questionCount).toBe(7)
    expect(r.stats.value.homeworkCount).toBe(3)
    expect(r.score.value.questionScore).toBe(80)
    expect(r.score.value.marksScore).toBe(85)
    expect(r.score.value.extraScore).toBe(5)
    expect(r.pending.value).toBe(false)
  })

  it('grades 中无该 userId 时 score 保持为 0', async () => {
    setMockFetchHandler(async (url: string) => {
      if (String(url).includes('/api/courses/grades')) {
        return { data: { grades: [{ userId: 99, questionScore: 80 }] }, success: true, msg: '' }
      }
      return { data: { questionCount: 1, homeworkCount: 0, quizCount: 0, raceCount: 0, commentCount: 0 }, success: true, msg: '' }
    })
    const { useStudentGrades } = await import('../../composables/useStudentGrades')
    const isOpen = ref(true)
    const r = useStudentGrades({ courseId: 1, userId: 1 }, isOpen)
    await new Promise(res => setTimeout(res, 0))
    expect(r.score.value.questionScore).toBe(0)
  })

  it('stats 接口失败时不影响 score 加载', async () => {
    setMockFetchHandler(async (url: string) => {
      if (String(url).includes('/api/courses/stats')) throw new Error('boom')
      if (String(url).includes('/api/courses/grades')) {
        return { data: [{ userId: 1, questionScore: 60 }], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useStudentGrades } = await import('../../composables/useStudentGrades')
    const isOpen = ref(true)
    const r = useStudentGrades({ courseId: 1, userId: 1 }, isOpen)
    await new Promise(res => setTimeout(res, 0))
    expect(r.score.value.questionScore).toBe(60)
    expect(r.pending.value).toBe(false)
  })

  it('classId 提供时 grades 请求附带 classId', async () => {
    const calls: string[] = []
    setMockFetchHandler(async (url: string) => {
      calls.push(String(url))
      if (String(url).includes('/api/courses/stats')) {
        return { data: { questionCount: 0, homeworkCount: 0, quizCount: 0, raceCount: 0, commentCount: 0 }, success: true, msg: '' }
      }
      if (String(url).includes('/api/courses/grades')) {
        return { data: [], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useStudentGrades } = await import('../../composables/useStudentGrades')
    const isOpen = ref(true)
    useStudentGrades({ courseId: 1, userId: 1, classId: 99 }, isOpen)
    await new Promise(res => setTimeout(res, 0))
    expect(calls.some(u => u.includes('classId=99'))).toBe(true)
  })

  it('statCards 包含 5 项且 label/value 来自 stats', async () => {
    setMockFetchHandler(async (url: string) => {
      if (String(url).includes('/api/courses/stats')) {
        return { data: { questionCount: 1, homeworkCount: 2, quizCount: 3, raceCount: 4, commentCount: 5 }, success: true, msg: '' }
      }
      if (String(url).includes('/api/courses/grades')) {
        return { data: [], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useStudentGrades } = await import('../../composables/useStudentGrades')
    const isOpen = ref(true)
    const r = useStudentGrades({ courseId: 1, userId: 1 }, isOpen)
    await new Promise(res => setTimeout(res, 0))
    expect(r.statCards.value).toHaveLength(5)
    const values = r.statCards.value.map((c: any) => c.value)
    expect(values).toEqual([1, 2, 3, 4, 5])
  })

  it('radarOption 包含 6 个维度的 indicator', async () => {
    const { useStudentGrades } = await import('../../composables/useStudentGrades')
    const isOpen = ref(false)
    const r = useStudentGrades({ courseId: 1, userId: 1 }, isOpen)
    const opt: any = r.radarOption.value
    expect(opt.radar.indicator).toHaveLength(6)
    expect(opt.series[0].data[0].value).toHaveLength(6)
  })
})
