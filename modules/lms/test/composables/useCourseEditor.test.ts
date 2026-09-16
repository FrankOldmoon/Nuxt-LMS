/**
 * useCourseEditor composable 测试
 * @see modules/lms/composables/useCourseEditor.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  resetAllStubs,
  setMockI18n,
  setMockFetchHandler,
  setMockAuthUser,
  getToastCalls,
} from '../../../../test/setup/nuxt-stubs'
import { ref } from 'vue'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
  // 桩 useAuthLms（auto-import from lms）
  ;(globalThis as any).useAuthLms = () => ({
    isCourseEditor: (cid: number) => cid === 5,
    isCourseTeacher: (cid: number) => cid === 5,
  })
})

describe('composables/useCourseEditor', () => {
  it('初始状态', async () => {
    setMockAuthUser({ id: 1, name: 'guest' })
    const { useCourseEditor } = await import('../../composables/useCourseEditor')
    const emit = vi.fn()
    const r = useCourseEditor({ courseId: 1 }, emit)
    expect(r.open.value).toBe(false)
    expect(r.loading.value).toBe(false)
    expect(r.saving.value).toBe(false)
    expect(r.form.value).toEqual({ name: '', code: '', tags: [], status: 'published' })
    expect(r.contentJson.value).toBeNull()
    expect(r.lockId.value).toBe('courses_1')
  })

  it('canEdit：admin 永远 true', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const { useCourseEditor } = await import('../../composables/useCourseEditor')
    const emit = vi.fn()
    const r = useCourseEditor({ courseId: 99 }, emit)
    expect(r.canEdit.value).toBe(true)
  })

  it('canEdit：editor 课程 5 时 true', async () => {
    setMockAuthUser({ id: 1, name: 'guest' })
    const { useCourseEditor } = await import('../../composables/useCourseEditor')
    const emit = vi.fn()
    const r = useCourseEditor({ courseId: 5 }, emit)
    expect(r.canEdit.value).toBe(true)
  })

  it('canEdit：非 editor 时 false', async () => {
    setMockAuthUser({ id: 1, name: 'guest' })
    const { useCourseEditor } = await import('../../composables/useCourseEditor')
    const emit = vi.fn()
    const r = useCourseEditor({ courseId: 99 }, emit)
    expect(r.canEdit.value).toBe(false)
  })

  it('openModal / closeModal 切换 open', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const { useCourseEditor } = await import('../../composables/useCourseEditor')
    const emit = vi.fn()
    const r = useCourseEditor({ courseId: 1 }, emit)
    r.openModal()
    expect(r.open.value).toBe(true)
    r.closeModal()
    expect(r.open.value).toBe(false)
  })

  it('loadCourse 拉取并填充 form/contentJson', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/courses/show?id=')) {
        return {
          data: {
            title: 'Course A',
            code: 'CA',
            tags: ['t1', 't2'],
            content: { type: 'doc' },
            config: { icon: 'star' },
          },
          success: true,
          msg: '',
        }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useCourseEditor } = await import('../../composables/useCourseEditor')
    const emit = vi.fn()
    const r = useCourseEditor({ courseId: 1 }, emit)
    // 注入 configFormRef 模拟组件挂载后的赋值
    r.configFormRef.value = {
      initFromConfig: vi.fn(),
      buildConfig: vi.fn(() => ({ icon: 'star' })),
    }
    await r.loadCourse()
    expect(r.form.value.name).toBe('Course A')
    expect(r.form.value.code).toBe('CA')
    expect(r.form.value.tags).toEqual(['t1', 't2'])
    expect(r.contentJson.value).toEqual({ type: 'doc' })
    expect(r.loading.value).toBe(false)
    expect(r.configFormRef.value.initFromConfig).toHaveBeenCalledWith({ icon: 'star' })
  })

  it('loadCourse 失败时 toast 报错', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    setMockFetchHandler(async () => ({ data: null, success: false, msg: 'fail' }))
    const { useCourseEditor } = await import('../../composables/useCourseEditor')
    const emit = vi.fn()
    const r = useCourseEditor({ courseId: 1 }, emit)
    await r.loadCourse()
    const toasts = getToastCalls()
    expect(toasts.some((t) => t.color === 'error')).toBe(true)
    expect(r.loading.value).toBe(false)
  })

  it('save 成功时 emit saved + closeModal + toast', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    setMockFetchHandler(async (url, opts: any) => {
      if (url === '/api/courses/update' && opts?.method === 'POST') {
        return { data: null, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useCourseEditor } = await import('../../composables/useCourseEditor')
    const emit = vi.fn()
    const r = useCourseEditor({ courseId: 1 }, emit)
    r.openModal()
    r.configFormRef.value = {
      initFromConfig: vi.fn(),
      buildConfig: vi.fn(() => ({ icon: 'star' })),
    }
    await r.save()
    expect(r.saving.value).toBe(false)
    expect(r.open.value).toBe(false)
    expect(emit).toHaveBeenCalledWith('saved')
    const toasts = getToastCalls()
    expect(toasts.some((t) => t.color === 'success')).toBe(true)
  })

  it('save buildConfig 返回 null 时不调用 API', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    let called = false
    setMockFetchHandler(async (url, opts: any) => {
      if (url === '/api/courses/update' && opts?.method === 'POST') {
        called = true
      }
      return { data: null, success: true, msg: '' }
    })
    const { useCourseEditor } = await import('../../composables/useCourseEditor')
    const emit = vi.fn()
    const r = useCourseEditor({ courseId: 1 }, emit)
    r.configFormRef.value = {
      initFromConfig: vi.fn(),
      buildConfig: vi.fn(() => null),
    }
    await r.save()
    expect(called).toBe(false)
  })

  it('save 失败时 toast 报错', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    setMockFetchHandler(async (url, opts: any) => {
      if (url === '/api/courses/update' && opts?.method === 'POST') {
        return { data: null, success: false, msg: 'denied' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useCourseEditor } = await import('../../composables/useCourseEditor')
    const emit = vi.fn()
    const r = useCourseEditor({ courseId: 1 }, emit)
    r.openModal()
    r.configFormRef.value = {
      initFromConfig: vi.fn(),
      buildConfig: vi.fn(() => ({ icon: 'star' })),
    }
    await r.save()
    expect(r.open.value).toBe(true) // 不关闭
    expect(emit).not.toHaveBeenCalledWith('saved')
    const toasts = getToastCalls()
    expect(toasts.some((t) => t.color === 'error')).toBe(true)
  })

  it('open 变 true 时触发 loadCourse', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    let called = false
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/courses/show?id=')) {
        called = true
        return { data: { title: 'a', code: '', tags: [], content: null, config: {} }, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useCourseEditor } = await import('../../composables/useCourseEditor')
    const emit = vi.fn()
    const r = useCourseEditor({ courseId: 1 }, emit)
    r.configFormRef.value = { initFromConfig: vi.fn(), buildConfig: vi.fn(() => ({})) }
    expect(called).toBe(false)
    r.open.value = true
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(called).toBe(true)
  })
})
