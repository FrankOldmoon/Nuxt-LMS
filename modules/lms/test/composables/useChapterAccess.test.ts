/**
 * useChapterAccess composable test
 * @see modules/lms/composables/useChapterAccess.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  resetAllStubs,
  setMockI18n,
  setMockFetchHandler,
  setMockAuthUser,
  getToastCalls,
} from '../../../../test/setup/nuxt-stubs'
import { ref, computed } from 'vue'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
  // Stub useClasses (auto-import from base)
  const classesRef = ref<any[]>([])
  ;(globalThis as any).useClasses = () => ({
    classes: classesRef,
    classOptions: computed(() => classesRef.value.map((c: any) => ({ label: c.name, value: c.id }))),
    loadClasses: vi.fn(),
  })
  // Stub useAuthLms (auto-import from lms)
  ;(globalThis as any).useAuthLms = () => ({
    isCourseTeacher: (cid: number) => cid === 5, // only course 5 counts as teacher
    isCourseEditor: (cid: number) => cid === 5,
  })
  ;(globalThis as any).__classesRef = classesRef
})

describe('composables/useChapterAccess', () => {
  it('admin 永远 canEdit', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const { useChapterAccess } = await import('../../composables/useChapterAccess')
    const r = useChapterAccess({ chapterId: 1, courseId: 99 })
    expect(r.canEdit.value).toBe(true)
  })

  it('非 admin 非 teacher 不可 canEdit', async () => {
    setMockAuthUser({ id: 2, name: 'student' }, [{ code: 'student', name: 'Student' }])
    const { useChapterAccess } = await import('../../composables/useChapterAccess')
    const r = useChapterAccess({ chapterId: 1, courseId: 99 })
    expect(r.canEdit.value).toBe(false)
  })

  it('teacher 是课程教师时 canEdit=true', async () => {
    setMockAuthUser({ id: 3, name: 'teacher' }, [{ code: 'teacher', name: 'Teacher' }])
    const { useChapterAccess } = await import('../../composables/useChapterAccess')
    const r = useChapterAccess({ chapterId: 1, courseId: 5 }) // courseId 5 → isCourseTeacher=true
    expect(r.canEdit.value).toBe(true)
  })

  it('courseId=0 时非 admin canEdit=false', async () => {
    setMockAuthUser({ id: 3, name: 'teacher' }, [{ code: 'teacher', name: 'Teacher' }])
    const { useChapterAccess } = await import('../../composables/useChapterAccess')
    const r = useChapterAccess({ chapterId: 1, courseId: 0 })
    expect(r.canEdit.value).toBe(false)
  })

  it('从 chapterData 同步 isOpen 与 selectedClassIds', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const { useChapterAccess } = await import('../../composables/useChapterAccess')
    const r = useChapterAccess({
      chapterId: 1,
      courseId: 1,
      chapterData: {
        isOpen: true,
        classChapters: [
          { classId: 10, open: true },
          { classId: 20, open: false },
          { classId: 30, open: true },
        ],
      },
    })
    expect(r.isOpen.value).toBe(true)
    expect(r.selectedClassIds.value).toEqual([10, 30])
  })

  it('chapterData 为 undefined 时 isOpen=false, selectedClassIds=[]', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const { useChapterAccess } = await import('../../composables/useChapterAccess')
    const r = useChapterAccess({ chapterId: 1, courseId: 1, chapterData: undefined })
    expect(r.isOpen.value).toBe(false)
    expect(r.selectedClassIds.value).toEqual([])
  })

  it('classOptions 来自 classes 缓存', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const { useChapterAccess } = await import('../../composables/useChapterAccess')
    const r = useChapterAccess({ chapterId: 1, courseId: 1 })
    const classesRef = (globalThis as any).__classesRef
    classesRef.value = [
      { id: 10, name: 'Class A' },
      { id: 20, name: 'Class B' },
    ]
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(r.classOptions.value).toEqual([
      { label: 'Class A', value: 10 },
      { label: 'Class B', value: 20 },
    ])
  })

  it('updateOpen 成功时 toast 提示', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    setMockFetchHandler(async (url, opts: any) => {
      if (url === '/api/chapters/update' && opts?.method === 'POST') {
        return { data: null, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useChapterAccess } = await import('../../composables/useChapterAccess')
    const r = useChapterAccess({ chapterId: 1, courseId: 1 })
    await r.updateOpen(true)
    expect(r.savingOpen.value).toBe(false)
    const toasts = getToastCalls()
    expect(toasts.some((t) => t.color === 'success')).toBe(true)
  })

  it('updateOpen 失败时 toast 报错并回滚 isOpen', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    setMockFetchHandler(async (url, opts: any) => {
      if (url === '/api/chapters/update' && opts?.method === 'POST') {
        return { data: null, success: false, msg: 'denied' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useChapterAccess } = await import('../../composables/useChapterAccess')
    const r = useChapterAccess({ chapterId: 1, courseId: 1 })
    r.isOpen.value = false
    await r.updateOpen(true) // Attempted to change to true, but failed
    expect(r.isOpen.value).toBe(false) // Rollback
    const toasts = getToastCalls()
    expect(toasts.some((t) => t.color === 'error')).toBe(true)
  })

  it('updateClassOpen 成功时 toast 提示', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    setMockFetchHandler(async (url, opts: any) => {
      if (url === '/api/chapters/classes' && opts?.method === 'POST') {
        return { data: null, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const classesRef = (globalThis as any).__classesRef
    classesRef.value = [
      { id: 10, name: 'A' },
      { id: 20, name: 'B' },
    ]
    const { useChapterAccess } = await import('../../composables/useChapterAccess')
    const r = useChapterAccess({ chapterId: 1, courseId: 1 })
    await r.updateClassOpen([10])
    const toasts = getToastCalls()
    expect(toasts.some((t) => t.color === 'success')).toBe(true)
  })

  it('updateClassOpen 失败时 toast 报错', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    setMockFetchHandler(async (url, opts: any) => {
      if (url === '/api/chapters/classes' && opts?.method === 'POST') {
        return { data: null, success: false, msg: 'denied' }
      }
      return { data: null, success: true, msg: '' }
    })
    const classesRef = (globalThis as any).__classesRef
    classesRef.value = [{ id: 10, name: 'A' }]
    const { useChapterAccess } = await import('../../composables/useChapterAccess')
    const r = useChapterAccess({ chapterId: 1, courseId: 1 })
    await r.updateClassOpen([10])
    const toasts = getToastCalls()
    expect(toasts.some((t) => t.color === 'error')).toBe(true)
  })
})
