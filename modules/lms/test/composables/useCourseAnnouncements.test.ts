/**
 * useCourseAnnouncements composable 测试
 * @see modules/lms/composables/useCourseAnnouncements.ts
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

beforeEach(async () => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
  // 覆盖 useAuth 桩以包含 isCourseTeacher（源码 destructure 自动获得）
  const baseUseAuth = (globalThis as any).useAuth
  ;(globalThis as any).useAuth = () => {
    const base = baseUseAuth()
    return {
      ...base,
      isCourseTeacher: (cid: number) => cid === 5,
      isCourseEditor: (cid: number) => cid === 5,
    }
  }
  // 桩 useAuthLms（auto-import from lms）
  ;(globalThis as any).useAuthLms = () => ({
    isCourseTeacher: (cid: number) => cid === 5,
    isCourseEditor: (cid: number) => cid === 5,
  })
  // renderContent 依赖 auto-import 的 extractText：用真实实现
  const { extractText } = await import('../../utils/tiptapText')
  ;(globalThis as any).extractText = extractText
})

describe('composables/useCourseAnnouncements', () => {
  it('初始状态', async () => {
    setMockAuthUser({ id: 1, name: 'guest' })
    const isOpen = ref(false)
    const { useCourseAnnouncements } = await import('../../composables/useCourseAnnouncements')
    const r = useCourseAnnouncements({ courseId: 1 }, isOpen)
    expect(r.pending.value).toBe(false)
    expect(r.creating.value).toBe(false)
    expect(r.showCreateForm.value).toBe(false)
    expect(r.announcements.value).toEqual([])
    expect(r.classes.value).toEqual([])
    expect(r.form.value).toEqual({ name: '', contentText: '', classIds: [] })
  })

  it('canCreate：admin 永远 true', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseAnnouncements } = await import('../../composables/useCourseAnnouncements')
    const r = useCourseAnnouncements({ courseId: 99 }, isOpen)
    expect(r.canCreate.value).toBe(true)
  })

  it('canCreate：teacher 永远 true', async () => {
    setMockAuthUser({ id: 1, name: 't' }, [{ code: 'teacher', name: 'Teacher' }])
    const isOpen = ref(false)
    const { useCourseAnnouncements } = await import('../../composables/useCourseAnnouncements')
    const r = useCourseAnnouncements({ courseId: 99 }, isOpen)
    expect(r.canCreate.value).toBe(true)
  })

  it('canCreate：courseId=0 永远 false', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseAnnouncements } = await import('../../composables/useCourseAnnouncements')
    const r = useCourseAnnouncements({ courseId: 0 }, isOpen)
    expect(r.canCreate.value).toBe(false)
  })

  it('canCreate：非 admin/teacher 但 isCourseTeacher 时 true', async () => {
    setMockAuthUser({ id: 1, name: 'guest' })
    const isOpen = ref(false)
    const { useCourseAnnouncements } = await import('../../composables/useCourseAnnouncements')
    const r = useCourseAnnouncements({ courseId: 5 }, isOpen) // courseId=5 → isCourseTeacher=true
    expect(r.canCreate.value).toBe(true)
  })

  it('toggleClass 切换 classIds', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseAnnouncements } = await import('../../composables/useCourseAnnouncements')
    const r = useCourseAnnouncements({ courseId: 1 }, isOpen)
    r.toggleClass(10, true)
    expect(r.form.value.classIds).toEqual([10])
    r.toggleClass(20, true)
    expect(r.form.value.classIds).toEqual([10, 20])
    r.toggleClass(10, false)
    expect(r.form.value.classIds).toEqual([20])
  })

  it('formatTime 无效时间返回空字符串', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseAnnouncements } = await import('../../composables/useCourseAnnouncements')
    const r = useCourseAnnouncements({ courseId: 1 }, isOpen)
    expect(r.formatTime('')).toBe('')
    expect(r.formatTime(null)).toBe('')
    expect(r.formatTime('not-a-date')).toBe('')
  })

  it('formatTime 有效时间返回字符串', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseAnnouncements } = await import('../../composables/useCourseAnnouncements')
    const r = useCourseAnnouncements({ courseId: 1 }, isOpen)
    const s = r.formatTime('2024-01-01T00:00:00Z')
    expect(typeof s).toBe('string')
    expect(s.length).toBeGreaterThan(0)
  })

  it('renderContent 处理 null/字符串/对象', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseAnnouncements } = await import('../../composables/useCourseAnnouncements')
    const r = useCourseAnnouncements({ courseId: 1 }, isOpen)
    expect(r.renderContent(null)).toBe('')
    expect(r.renderContent('hello')).toBe('hello')
    expect(r.renderContent({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'world' }] }] })).toBe('world')
  })

  it('toggleCreateForm 切换显示并重置 form', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseAnnouncements } = await import('../../composables/useCourseAnnouncements')
    const r = useCourseAnnouncements({ courseId: 1 }, isOpen)
    r.form.value = { name: 'old', contentText: 'text', classIds: [1] }
    r.toggleCreateForm() // 关闭时重置
    expect(r.showCreateForm.value).toBe(true)
    r.toggleCreateForm() // 关闭
    expect(r.showCreateForm.value).toBe(false)
    expect(r.form.value).toEqual({ name: '', contentText: '', classIds: [] })
  })

  it('loadData 拉取公告和班级', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    setMockFetchHandler(async (url) => {
      if (url === '/api/classes/list') {
        return { data: [{ id: 10, name: 'ClassA' }], success: true, msg: '' }
      }
      if (url === '/api/announcements/list') {
        return { data: [{ id: 1, name: 'ann1', content: null }], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useCourseAnnouncements } = await import('../../composables/useCourseAnnouncements')
    const r = useCourseAnnouncements({ courseId: 1 }, isOpen)
    await r.loadData()
    expect(r.announcements.value).toHaveLength(1)
    expect(r.classes.value).toHaveLength(1)
    expect(r.pending.value).toBe(false)
  })

  it('loadData 失败时 toast 报错', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    setMockFetchHandler(async () => ({ data: null, success: false, msg: 'fail' }))
    const isOpen = ref(false)
    const { useCourseAnnouncements } = await import('../../composables/useCourseAnnouncements')
    const r = useCourseAnnouncements({ courseId: 1 }, isOpen)
    await r.loadData()
    const toasts = getToastCalls()
    expect(toasts.some((t) => t.color === 'error')).toBe(true)
    expect(r.pending.value).toBe(false)
  })

  it('createAnnouncement 成功后 reload + 关闭表单 + toast', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    setMockFetchHandler(async (url, opts: any) => {
      if (url === '/api/announcements/add' && opts?.method === 'POST') {
        return { data: null, success: true, msg: '' }
      }
      if (url === '/api/announcements/list') {
        return { data: [], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useCourseAnnouncements } = await import('../../composables/useCourseAnnouncements')
    const r = useCourseAnnouncements({ courseId: 1 }, isOpen)
    r.showCreateForm.value = true
    r.form.value = { name: 'New Ann', contentText: 'Body', classIds: [] }
    await r.createAnnouncement()
    expect(r.showCreateForm.value).toBe(false)
    expect(r.creating.value).toBe(false)
    const toasts = getToastCalls()
    expect(toasts.some((t) => t.color === 'success')).toBe(true)
  })

  it('createAnnouncement 名字为空时不调用', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    let called = false
    setMockFetchHandler(async (url, opts: any) => {
      if (url === '/api/announcements/add' && opts?.method === 'POST') {
        called = true
      }
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useCourseAnnouncements } = await import('../../composables/useCourseAnnouncements')
    const r = useCourseAnnouncements({ courseId: 1 }, isOpen)
    r.form.value = { name: '   ', contentText: '', classIds: [] }
    await r.createAnnouncement()
    expect(called).toBe(false)
  })

  it('deleteAnnouncement 成功后 reload', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    let deleteCalled = false
    let listCallCount = 0
    setMockFetchHandler(async (url, opts: any) => {
      if (url === '/api/announcements/delete' && opts?.method === 'POST') {
        deleteCalled = true
        return { data: null, success: true, msg: '' }
      }
      if (url === '/api/announcements/list') {
        listCallCount++
        return { data: [], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useCourseAnnouncements } = await import('../../composables/useCourseAnnouncements')
    const r = useCourseAnnouncements({ courseId: 1 }, isOpen)
    await r.deleteAnnouncement(99)
    expect(deleteCalled).toBe(true)
    expect(listCallCount).toBeGreaterThanOrEqual(1)
  })

  it('isOpen 变 true 时触发 loadData', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    let called = false
    setMockFetchHandler(async (url) => {
      if (url === '/api/announcements/list') called = true
      return { data: [], success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useCourseAnnouncements } = await import('../../composables/useCourseAnnouncements')
    const r = useCourseAnnouncements({ courseId: 1 }, isOpen)
    expect(called).toBe(false)
    isOpen.value = true
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(called).toBe(true)
  })
})
