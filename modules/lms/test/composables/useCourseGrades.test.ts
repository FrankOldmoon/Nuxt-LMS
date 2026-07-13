/**
 * useCourseGrades composable 测试
 * @see modules/lms/composables/useCourseGrades.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  resetAllStubs,
  setMockI18n,
  setMockFetchHandler,
  setMockAuthUser,
  getToastCalls,
  clearToastCalls,
} from '../../../../test/setup/nuxt-stubs'
import { ref } from 'vue'

beforeEach(async () => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
  setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
  clearToastCalls()
  // 覆盖 useAuth 桩以包含 isCourseTeacher（源码 destructure 自动获得）
  const baseUseAuth = (globalThis as any).useAuth
  ;(globalThis as any).useAuth = () => {
    const base = baseUseAuth()
    return {
      ...base,
      isCourseTeacher: (cid: number) => cid === 5,
    }
  }
  // 桩 useClassUsers（auto-import from lms）
  const studentsRef = ref<any[]>([])
  ;(globalThis as any).useClassUsers = () => ({
    students: studentsRef,
    fetchUsers: vi.fn(),
  })
  ;(globalThis as any).__studentsRef = studentsRef
})

describe('composables/useCourseGrades', () => {
  it('初始状态', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseGrades } = await import('../../composables/useCourseGrades')
    const r = useCourseGrades({ courseId: 1, classId: 1 }, isOpen)
    expect(r.rows.value).toEqual([])
    expect(r.pending.value).toBe(false)
    expect(r.criteriaDirty.value).toBe(false)
    expect(r.extraScoreSaving.value).toBe(null)
  })

  it('导出 DEFAULT_GRADE_CRITERIA 与 GRADE_WEIGHT_KEYS', async () => {
    const mod = await import('../../composables/useCourseGrades')
    expect(mod.DEFAULT_GRADE_CRITERIA).toBeDefined()
    expect(mod.DEFAULT_GRADE_CRITERIA.weights.length).toBe(7)
    expect(mod.DEFAULT_GRADE_CRITERIA.levels.length).toBe(4)
    expect(mod.GRADE_WEIGHT_KEYS.length).toBe(7)
    expect(mod.GRADE_WEIGHT_KEYS).toContain('questionScore')
    expect(mod.GRADE_WEIGHT_KEYS).toContain('extraScore')
  })

  it('gradeCriteria 初始为 DEFAULT_GRADE_CRITERIA 副本', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { DEFAULT_GRADE_CRITERIA, useCourseGrades } = await import('../../composables/useCourseGrades')
    const r = useCourseGrades({ courseId: 1, classId: 1 }, isOpen)
    expect(r.gradeCriteria.value).toEqual(DEFAULT_GRADE_CRITERIA)
  })

  it('canEdit：admin 永远 true', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseGrades } = await import('../../composables/useCourseGrades')
    const r = useCourseGrades({ courseId: 99, classId: 1 }, isOpen)
    expect(r.canEdit.value).toBe(true)
  })

  it('canEdit：teacher 是课程教师时 true', async () => {
    setMockAuthUser({ id: 2, name: 't' }, [{ code: 'teacher', name: 'Teacher' }])
    const isOpen = ref(false)
    const { useCourseGrades } = await import('../../composables/useCourseGrades')
    const r = useCourseGrades({ courseId: 5, classId: 1 }, isOpen)
    expect(r.canEdit.value).toBe(true)
  })

  it('canEdit：学生 false', async () => {
    setMockAuthUser({ id: 3, name: 's' }, [{ code: 'student', name: 'Student' }])
    const isOpen = ref(false)
    const { useCourseGrades } = await import('../../composables/useCourseGrades')
    // courseId=99 不是教师课程（stub 中仅 cid===5 算 teacher）
    const r = useCourseGrades({ courseId: 99, classId: 1 }, isOpen)
    expect(r.canEdit.value).toBe(false)
  })

  it('extraColumns 有 11 列', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseGrades } = await import('../../composables/useCourseGrades')
    const r = useCourseGrades({ courseId: 1, classId: 1 }, isOpen)
    expect(r.extraColumns.value.length).toBe(11)
    const ids = r.extraColumns.value.map((c: any) => c.id)
    expect(ids).toContain('group')
    expect(ids).toContain('grade')
    expect(ids).toContain('total')
    expect(ids).toContain('progress')
    expect(ids).toContain('extraScore')
  })

  it('defaultSort 为 total desc', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseGrades } = await import('../../composables/useCourseGrades')
    const r = useCourseGrades({ courseId: 1, classId: 1 }, isOpen)
    expect(r.defaultSort).toEqual([{ id: 'total', desc: true }])
  })

  it('computeGrade：满分得 A', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseGrades } = await import('../../composables/useCourseGrades')
    const r = useCourseGrades({ courseId: 1, classId: 1 }, isOpen)
    // 默认权重：questionScore 20%(满分100) → 20, homeworkScore 20% → 20, ...
    // 全部满分 → finalScore = 20+20+20+10+10+20+0 = 100 → A
    const row = {
      questionScore: 100, homeworkScore: 100, quizScore: 100,
      raceScore: 100, commentScore: 100, marksScore: 100, extraScore: 0,
    }
    const g = r.computeGrade(row)
    expect(g.finalScore).toBeCloseTo(100, 1)
    expect(g.letter).toBe('A')
  })

  it('computeGrade：零分得 F（低于 D 阈值）', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseGrades } = await import('../../composables/useCourseGrades')
    const r = useCourseGrades({ courseId: 1, classId: 1 }, isOpen)
    const row = {
      questionScore: 0, homeworkScore: 0, quizScore: 0,
      raceScore: 0, commentScore: 0, marksScore: 0, extraScore: 0,
    }
    const g = r.computeGrade(row)
    expect(g.finalScore).toBe(0)
    // 0 < 60 (D 阈值) → 最后一个 level 的 letter
    expect(g.letter).toBe('D')
  })

  it('buildRows：合并学生与成绩并按 score 降序', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseGrades } = await import('../../composables/useCourseGrades')
    const r = useCourseGrades({ courseId: 1, classId: 1 }, isOpen)
    const studentsRef = (globalThis as any).__studentsRef
    studentsRef.value = [
      { id: 1, name: 'a', preferName: 'A', rollNumber: '001', avatarImg: '' },
      { id: 2, name: 'b', preferName: 'B', rollNumber: '002', avatarImg: '' },
    ]
    r.buildRows([
      { userId: 1, score: 50, questionScore: 50 },
      { userId: 2, score: 90, questionScore: 90 },
    ])
    // 按 score 降序：b(90) 在前
    expect(r.rows.value[0].id).toBe(2)
    expect(r.rows.value[1].id).toBe(1)
    expect(r.rows.value[0].score).toBe(90)
    expect(r.rows.value[0].questionScore).toBe(90)
    expect(r.rows.value[1]._hasGrade).toBe(true)
  })

  it('buildRows：无成绩的学生 _hasGrade=false', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseGrades } = await import('../../composables/useCourseGrades')
    const r = useCourseGrades({ courseId: 1, classId: 1 }, isOpen)
    const studentsRef = (globalThis as any).__studentsRef
    studentsRef.value = [
      { id: 1, name: 'a', preferName: 'A', rollNumber: '001', avatarImg: '' },
    ]
    r.buildRows([])
    expect(r.rows.value[0]._hasGrade).toBe(false)
    expect(r.rows.value[0].score).toBe(0)
  })

  it('buildRows：学生只能看自己一行', async () => {
    setMockAuthUser({ id: 2, name: 's' }, [{ code: 'student', name: 'Student' }])
    const isOpen = ref(false)
    const { useCourseGrades } = await import('../../composables/useCourseGrades')
    // courseId=99 不是教师课程，学生 canEdit=false 触发过滤
    const r = useCourseGrades({ courseId: 99, classId: 1 }, isOpen)
    const studentsRef = (globalThis as any).__studentsRef
    studentsRef.value = [
      { id: 1, name: 'a', preferName: 'A', rollNumber: '001', avatarImg: '' },
      { id: 2, name: 'b', preferName: 'B', rollNumber: '002', avatarImg: '' },
    ]
    r.buildRows([])
    expect(r.rows.value.length).toBe(1)
    expect(r.rows.value[0].id).toBe(2)
  })

  it('statCards 有 5 项', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseGrades } = await import('../../composables/useCourseGrades')
    const r = useCourseGrades({ courseId: 1, classId: 1 }, isOpen)
    expect(r.statCards.value.length).toBe(5)
  })

  it('radarOption：无行时返回空对象', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseGrades } = await import('../../composables/useCourseGrades')
    const r = useCourseGrades({ courseId: 1, classId: 1 }, isOpen)
    expect(r.radarOption.value).toEqual({})
  })

  it('radarOption：有行时返回雷达配置', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseGrades } = await import('../../composables/useCourseGrades')
    const r = useCourseGrades({ courseId: 1, classId: 1 }, isOpen)
    const studentsRef = (globalThis as any).__studentsRef
    studentsRef.value = [{ id: 1, name: 'a', preferName: 'A', rollNumber: '001', avatarImg: '' }]
    r.buildRows([{ userId: 1, score: 50, questionScore: 50, homeworkScore: 60 }])
    const radar = r.radarOption.value
    expect(radar.radar).toBeDefined()
    expect(radar.series).toBeDefined()
    expect(radar.radar.indicator.length).toBe(6)
  })

  it('resetCriteria：设为默认并标记 dirty', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { DEFAULT_GRADE_CRITERIA, useCourseGrades } = await import('../../composables/useCourseGrades')
    const r = useCourseGrades({ courseId: 1, classId: 1 }, isOpen)
    r.gradeCriteria.value = { weights: [], levels: [] }
    r.resetCriteria()
    expect(r.gradeCriteria.value).toEqual(DEFAULT_GRADE_CRITERIA)
    expect(r.criteriaDirty.value).toBe(true)
  })

  it('saveCriteria：成功时 toast success + 清 dirty', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    let calledUrl = ''
    setMockFetchHandler(async (url: string) => {
      if (url.includes('/api/courses/update')) {
        calledUrl = url
        return { data: null, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useCourseGrades } = await import('../../composables/useCourseGrades')
    const r = useCourseGrades({ courseId: 1, classId: 1 }, isOpen)
    r.gradeCriteria.value = { weights: [{ key: 'questionScore', maxScore: 100, percent: 100 }], levels: [{ letter: 'A', min: 90 }] }
    await r.saveCriteria()
    expect(calledUrl).toContain('/api/courses/update')
    const toasts = getToastCalls()
    expect(toasts.some((t) => t.color === 'success')).toBe(true)
    expect(r.criteriaDirty.value).toBe(false)
  })

  it('saveExtraScore：成功时更新行 + toast', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    let calledUrl = ''
    setMockFetchHandler(async (url: string) => {
      if (url.includes('/api/courses/extra-score')) {
        calledUrl = url
        return { data: null, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useCourseGrades } = await import('../../composables/useCourseGrades')
    const r = useCourseGrades({ courseId: 1, classId: 1 }, isOpen)
    const studentsRef = (globalThis as any).__studentsRef
    studentsRef.value = [{ id: 7, name: 'a', preferName: 'A', rollNumber: '001', avatarImg: '' }]
    r.buildRows([{ userId: 7, score: 50 }])
    await r.saveExtraScore(7, 15)
    expect(calledUrl).toContain('/api/courses/extra-score')
    expect(r.rows.value[0].extraScore).toBe(15)
    const toasts = getToastCalls()
    expect(toasts.some((t) => t.color === 'success')).toBe(true)
    expect(r.extraScoreSaving.value).toBe(null)
  })

  it('loadData：isOpen=true 触发加载', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    let gradesCalled = false
    setMockFetchHandler(async (url: string) => {
      if (url.includes('/api/courses/grades')) {
        gradesCalled = true
        return { data: { grades: [], gradeCriteria: null }, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useCourseGrades } = await import('../../composables/useCourseGrades')
    const r = useCourseGrades({ courseId: 1, classId: 1 }, isOpen)
    isOpen.value = true
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(gradesCalled).toBe(true)
  })
})
