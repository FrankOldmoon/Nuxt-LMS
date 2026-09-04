/**
 * useCourseUserSelect composable 测试
 * @see modules/lms/composables/useCourseUserSelect.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import {
  resetAllStubs,
  setMockI18n,
  setMockFetchHandler,
  setMockAuthUser,
  getToastCalls,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
  // stub useClassUsers（auto-imported）：students 为可变 ref，fetchUsers 填充班级学生
  const studentsRef = ref<any[]>([])
  ;(globalThis as any).useClassUsers = () => ({
    students: studentsRef,
    teachers: ref<any[]>([]),
    fetchUsers: async (classId: number) => {
      studentsRef.value = [{ id: 2, name: 'Class Student', preferName: 'CS' }]
    },
  })
})

describe('composables/useCourseUserSelect', () => {
  it('初始状态正确', async () => {
    const { useCourseUserSelect } = await import('../../composables/useCourseUserSelect')
    const { loading, restoring, selectedUserId, impersonating, allStudents } = useCourseUserSelect({ courseId: 1 }, () => {})
    expect(loading.value).toBe(false)
    expect(restoring.value).toBe(false)
    expect(selectedUserId.value).toBeNull()
    expect(impersonating.value).toBe(false)
    expect(allStudents.value).toEqual([])
  })

  it('loadStudents 使用当前班级（defaultClass）学生，与 select class 一致', async () => {
    setMockAuthUser(
      { id: 1, name: 'Admin', defaultClass: { id: 10 } },
      [{ code: 'admin', name: 'Admin' }],
      [],
    )
    const { useCourseUserSelect } = await import('../../composables/useCourseUserSelect')
    const { loadStudents, userOptions } = useCourseUserSelect({ courseId: 1 }, () => {})
    await loadStudents()
    // 不再请求 /api/users/students 全量学生；显示班级学生
    expect(userOptions.value).toHaveLength(1)
    expect(userOptions.value[0].value).toBe(2)
    expect(userOptions.value[0].label).toBe('Class Student (CS)')
  })

  it('onSelect 调用 impersonate API', async () => {
    setMockAuthUser(
      { id: 1, name: 'Admin' },
      [{ code: 'admin', name: 'Admin' }],
      [],
    )
    let impersonateCalled = false
    setMockFetchHandler(async (url, opts: any) => {
      if (url === '/api/auth/impersonate' && opts.method === 'POST') {
        impersonateCalled = true
        return { data: null, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useCourseUserSelect } = await import('../../composables/useCourseUserSelect')
    let emittedUserId = 0
    const { onSelect, impersonating } = useCourseUserSelect({ courseId: 1 }, (e, userId) => { emittedUserId = userId })
    await onSelect(5)
    expect(impersonateCalled).toBe(true)
    expect(impersonating.value).toBe(true)
    expect(emittedUserId).toBe(5)
    // 应显示成功 toast
    const toasts = getToastCalls()
    expect(toasts.length).toBeGreaterThan(0)
    expect(toasts[toasts.length - 1].color).toBe('success')
  })

  it('onSelect 失败时显示错误 toast', async () => {
    setMockAuthUser(
      { id: 1, name: 'Admin' },
      [{ code: 'admin', name: 'Admin' }],
      [],
    )
    setMockFetchHandler(async (url) => {
      if (url === '/api/auth/impersonate') {
        return { data: null, success: false, msg: 'impersonate failed' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useCourseUserSelect } = await import('../../composables/useCourseUserSelect')
    const { onSelect, selectedUserId } = useCourseUserSelect({ courseId: 1 }, () => {})
    await onSelect(5)
    expect(selectedUserId.value).toBeNull()
    const toasts = getToastCalls()
    expect(toasts.length).toBeGreaterThan(0)
    expect(toasts[toasts.length - 1].color).toBe('error')
  })

  it('restore 调用 restore API', async () => {
    setMockAuthUser(
      { id: 1, name: 'Admin' },
      [{ code: 'admin', name: 'Admin' }],
      [],
    )
    let restoreCalled = false
    setMockFetchHandler(async (url, opts: any) => {
      if (url === '/api/auth/restore' && opts.method === 'POST') {
        restoreCalled = true
        return { data: null, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useCourseUserSelect } = await import('../../composables/useCourseUserSelect')
    let restoredEmitted = false
    const { restore, impersonating, selectedUserId } = useCourseUserSelect(
      { courseId: 1 },
      (e) => { if (e === 'restored') restoredEmitted = true },
    )
    await restore()
    expect(restoreCalled).toBe(true)
    expect(impersonating.value).toBe(false)
    expect(selectedUserId.value).toBeNull()
    expect(restoredEmitted).toBe(true)
  })

  it('restore 失败时显示错误 toast', async () => {
    setMockAuthUser(
      { id: 1, name: 'Admin' },
      [{ code: 'admin', name: 'Admin' }],
      [],
    )
    setMockFetchHandler(async (url) => {
      if (url === '/api/auth/restore') {
        return { data: null, success: false, msg: 'restore failed' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useCourseUserSelect } = await import('../../composables/useCourseUserSelect')
    const { restore, restoring } = useCourseUserSelect({ courseId: 1 }, () => {})
    await restore()
    expect(restoring.value).toBe(false)
    const toasts = getToastCalls()
    expect(toasts.length).toBeGreaterThan(0)
    expect(toasts[toasts.length - 1].color).toBe('error')
  })

  it('userOptions 格式化班级学生列表', async () => {
    setMockAuthUser(
      { id: 1, name: 'Admin', defaultClass: { id: 10 } },
      [{ code: 'admin', name: 'Admin' }],
      [],
    )
    // 用班级学生数据覆盖 beforeEach 的 stub
    const studentsRef = ref<any[]>([])
    ;(globalThis as any).useClassUsers = () => ({
      students: studentsRef,
      teachers: ref<any[]>([]),
      fetchUsers: async () => {
        studentsRef.value = [
          { id: 1, name: 'Alice', preferName: 'A' },
          { id: 2, name: 'Bob', preferName: '' },
        ]
      },
    })
    const { useCourseUserSelect } = await import('../../composables/useCourseUserSelect')
    const { userOptions, loadStudents } = useCourseUserSelect({ courseId: 1 }, () => {})
    await loadStudents()
    expect(userOptions.value).toHaveLength(2)
    expect(userOptions.value[0].label).toBe('Alice (A)')
    expect(userOptions.value[1].label).toBe('Bob')
  })
})
