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
  // stub useClassUsers（auto-imported）
  ;(globalThis as any).useClassUsers = () => ({
    students: ref<any[]>([]),
    teachers: ref<any[]>([]),
    fetchUsers: async () => {},
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

  it('loadStudents admin 加载全部学生', async () => {
    setMockAuthUser(
      { id: 1, name: 'Admin', defaultClass: { id: 10 } },
      [{ code: 'admin', name: 'Admin' }],
      [],
    )
    setMockFetchHandler(async (url) => {
      if (url === '/api/users/students') {
        return { data: [{ id: 2, name: 'Student 1' }, { id: 3, name: 'Student 2' }], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useCourseUserSelect } = await import('../../composables/useCourseUserSelect')
    const { loadStudents, allStudents, userOptions } = useCourseUserSelect({ courseId: 1 }, () => {})
    await loadStudents()
    expect(allStudents.value).toHaveLength(2)
    expect(userOptions.value).toHaveLength(2)
    expect(userOptions.value[0].value).toBe(2)
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

  it('userOptions 格式化学生列表', async () => {
    setMockAuthUser(
      { id: 1, name: 'Admin' },
      [{ code: 'admin', name: 'Admin' }],
      [],
    )
    setMockFetchHandler(async (url) => {
      if (url === '/api/users/students') {
        return {
          data: [
            { id: 1, name: 'Alice', preferName: 'A' },
            { id: 2, name: 'Bob', preferName: '' },
          ],
          success: true,
          msg: '',
        }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useCourseUserSelect } = await import('../../composables/useCourseUserSelect')
    const { userOptions, loadStudents } = useCourseUserSelect({ courseId: 1 }, () => {})
    await loadStudents()
    expect(userOptions.value).toHaveLength(2)
    expect(userOptions.value[0].label).toBe('Alice (A)')
    expect(userOptions.value[1].label).toBe('Bob')
  })
})
