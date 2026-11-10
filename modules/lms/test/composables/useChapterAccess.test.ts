/**
 * useChapterAccess composable 测试
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
  // 桩 useClasses（auto-import from base）
  const classesRef = ref<any[]>([])
  const loadClassesMock = vi.fn()
  ;(globalThis as any).useClasses = () => ({
    classes: classesRef,
    classOptions: computed(() => classesRef.value.map((c: any) => ({ label: c.name, value: c.id }))),
    loadClasses: loadClassesMock,
  })
  // 桩 useAuthLms（auto-import from lms）
  ;(globalThis as any).useAuthLms = () => ({
    isCourseTeacher: (cid: number) => cid === 5, // 仅 course 5 算 teacher
    isCourseEditor: (cid: number) => cid === 5,
    isCourseStaff: (cid: number) => cid === 5,
    canEditCourse: (cid: number) => cid === 5, // 严格写权限（observer 场景由 useAuthLms 自身测试覆盖）
  })
  ;(globalThis as any).__classesRef = classesRef
  ;(globalThis as any).__loadClassesMock = loadClassesMock
})

describe('composables/useChapterAccess', () => {
  it('未登录访客不调用 loadClasses（不请求 /api/classes/list）', async () => {
    // 不调用 setMockAuthUser → user 为 null
    const { useChapterAccess } = await import('../../composables/useChapterAccess')
    useChapterAccess({ chapterId: 1, courseId: 1 })
    expect((globalThis as any).__loadClassesMock).not.toHaveBeenCalled()
  })

  it('学生（非可编辑角色）不调用 loadClasses', async () => {
    setMockAuthUser({ id: 2, name: 'student' }, [{ code: 'student', name: 'Student' }])
    const { useChapterAccess } = await import('../../composables/useChapterAccess')
    useChapterAccess({ chapterId: 1, courseId: 99 })
    expect((globalThis as any).__loadClassesMock).not.toHaveBeenCalled()
  })

  it('admin 调用 loadClasses 加载班级列表', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const { useChapterAccess } = await import('../../composables/useChapterAccess')
    useChapterAccess({ chapterId: 1, courseId: 1 })
    expect((globalThis as any).__loadClassesMock).toHaveBeenCalledTimes(1)
  })

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
    const classesRef = (globalThis as any).__classesRef
    classesRef.value = [
      { id: 10, name: 'Class A' },
      { id: 30, name: 'Class C' },
    ]
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
    await new Promise((resolve) => setTimeout(resolve, 0))
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

  it('selectedClassIds 过滤掉当前用户不可见的班级，classOptions 不含不可见班级', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const { useChapterAccess } = await import('../../composables/useChapterAccess')
    const r = useChapterAccess({
      chapterId: 1,
      courseId: 1,
      chapterData: {
        isOpen: true,
        classChapters: [
          { classId: 10, open: true },
          { classId: 99, open: true }, // 用户不可见班级
        ],
      },
    })
    const classesRef = (globalThis as any).__classesRef
    classesRef.value = [{ id: 10, name: 'Class A' }]
    await new Promise((resolve) => setTimeout(resolve, 0))
    // 已选值只含可见班级，用户不知情不可见班级
    expect(r.selectedClassIds.value).toEqual([10])
    expect(r.classOptions.value).toEqual([{ label: 'Class A', value: 10 }])
  })

  it('updateClassOpen 只提交用户可见的班级', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    let sentBody: any = null
    setMockFetchHandler(async (url, opts: any) => {
      if (url === '/api/chapters/classes' && opts?.method === 'POST') {
        sentBody = opts.body
      }
      return { data: null, success: true, msg: '' }
    })
    const classesRef = (globalThis as any).__classesRef
    classesRef.value = [{ id: 10, name: 'A' }]
    const { useChapterAccess } = await import('../../composables/useChapterAccess')
    const r = useChapterAccess({
      chapterId: 1,
      courseId: 1,
      chapterData: {
        isOpen: true,
        classChapters: [
          { classId: 10, open: true },
          { classId: 99, open: true }, // 用户不可见班级，不提交
        ],
      },
    })
    await r.updateClassOpen([10])
    expect(sentBody.classes).toEqual([{ classId: 10, open: true }])
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
    await r.updateOpen(true) // 试图改为 true，但失败
    expect(r.isOpen.value).toBe(false) // 回滚
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
