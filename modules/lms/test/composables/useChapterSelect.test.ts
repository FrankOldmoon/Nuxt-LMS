/**
 * useChapterSelect composable test
 * @see modules/lms/composables/useChapterSelect.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  resetAllStubs,
  setMockI18n,
  setMockFetchHandler,
  getToastCalls,
} from '../../../../test/setup/nuxt-stubs'
import { ref } from 'vue'

beforeEach(async () => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
  // useChapterSelect depends on auto-imported useClassUsers: use real implementation (already tested independently)
  const { useClassUsers } = await import('../../composables/useClassUsers')
  ;(globalThis as any).useClassUsers = useClassUsers
})

describe('composables/useChapterSelect', () => {
  it('初始状态', async () => {
    const isOpen = ref(false)
    const { useChapterSelect } = await import('../../composables/useChapterSelect')
    const r = useChapterSelect({ courseId: 1, classId: 10 }, isOpen)
    expect(r.loading.value).toBe(false)
    expect(r.saving.value).toBe(false)
    expect(r.randomizing.value).toBe(false)
    expect(r.selectedIds.value).toEqual([])
    expect(r.randomCount.value).toBe(1)
    expect(r.customScore.value).toBe(10)
  })

  it('toggleSelect 切换选中', async () => {
    const isOpen = ref(false)
    const { useChapterSelect } = await import('../../composables/useChapterSelect')
    const r = useChapterSelect({ courseId: 1, classId: 10 }, isOpen)
    r.toggleSelect(5)
    expect(r.selectedIds.value).toEqual([5])
    r.toggleSelect(6)
    expect(r.selectedIds.value).toEqual([5, 6])
    r.toggleSelect(5)
    expect(r.selectedIds.value).toEqual([6])
  })

  it('clearSelection 清空选中', async () => {
    const isOpen = ref(false)
    const { useChapterSelect } = await import('../../composables/useChapterSelect')
    const r = useChapterSelect({ courseId: 1, classId: 10 }, isOpen)
    r.toggleSelect(5)
    r.toggleSelect(6)
    r.clearSelection()
    expect(r.selectedIds.value).toEqual([])
  })

  it('adjustScore 无选中时不调用', async () => {
    let called = false
    setMockFetchHandler(async () => {
      called = true
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useChapterSelect } = await import('../../composables/useChapterSelect')
    const r = useChapterSelect({ courseId: 1, classId: 10 }, isOpen)
    await r.adjustScore(10)
    expect(called).toBe(false)
    expect(r.saving.value).toBe(false)
  })

  it('adjustScore delta=0 时不调用', async () => {
    let called = false
    setMockFetchHandler(async () => {
      called = true
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useChapterSelect } = await import('../../composables/useChapterSelect')
    const r = useChapterSelect({ courseId: 1, classId: 10 }, isOpen)
    r.toggleSelect(5)
    await r.adjustScore(0)
    expect(called).toBe(false)
  })

  it('adjustScore 成功时 toast 提示', async () => {
    setMockFetchHandler(async (url, opts: any) => {
      if (url === '/api/courses/marks' && opts?.method === 'POST') {
        return { data: null, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useChapterSelect } = await import('../../composables/useChapterSelect')
    const r = useChapterSelect({ courseId: 1, classId: 10 }, isOpen)
    r.toggleSelect(5)
    r.toggleSelect(6)
    await r.adjustScore(10)
    const toasts = getToastCalls()
    expect(toasts.some((t) => t.color === 'success')).toBe(true)
    expect(r.saving.value).toBe(false)
  })

  it('adjustScore 失败时 toast 报错', async () => {
    setMockFetchHandler(async (url, opts: any) => {
      if (url === '/api/courses/marks' && opts?.method === 'POST') {
        return { data: null, success: false, msg: 'denied' }
      }
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useChapterSelect } = await import('../../composables/useChapterSelect')
    const r = useChapterSelect({ courseId: 1, classId: 10 }, isOpen)
    r.toggleSelect(5)
    await r.adjustScore(10)
    const toasts = getToastCalls()
    expect(toasts.some((t) => t.color === 'error')).toBe(true)
  })

  it('adjustScore 无 courseId 时不调用', async () => {
    let called = false
    setMockFetchHandler(async () => {
      called = true
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useChapterSelect } = await import('../../composables/useChapterSelect')
    const r = useChapterSelect({ courseId: 0, classId: 10 }, isOpen)
    r.toggleSelect(5)
    await r.adjustScore(10)
    expect(called).toBe(false)
  })

  it('closePopovers 不抛错', async () => {
    const isOpen = ref(false)
    const { useChapterSelect } = await import('../../composables/useChapterSelect')
    const r = useChapterSelect({ courseId: 1, classId: 10 }, isOpen)
    expect(() => r.closePopovers()).not.toThrow()
  })

  it('isOpen 变 true 时触发 loadData', async () => {
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/classes/users')) {
        return { data: [{ id: 1, name: 'a', isTeacher: false }], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useChapterSelect } = await import('../../composables/useChapterSelect')
    const r = useChapterSelect({ courseId: 1, classId: 10 }, isOpen)
    isOpen.value = true
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(r.loading.value).toBe(false) // After loadData completes, loading=false
  })

  it('isOpen 变 false 时清空选中', async () => {
    const isOpen = ref(true)
    const { useChapterSelect } = await import('../../composables/useChapterSelect')
    const r = useChapterSelect({ courseId: 1, classId: 10 }, isOpen)
    r.toggleSelect(5)
    r.toggleSelect(6)
    expect(r.selectedIds.value).toHaveLength(2)
    isOpen.value = false
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(r.selectedIds.value).toEqual([])
    expect(r.customScore.value).toBe(10)
  })

  it('randomSelect 无学生时不启动', async () => {
    const isOpen = ref(false)
    const { useChapterSelect } = await import('../../composables/useChapterSelect')
    const r = useChapterSelect({ courseId: 1, classId: 10 }, isOpen)
    r.randomSelect()
    expect(r.randomizing.value).toBe(false)
  })
})
