/**
 * useClassModal composable 测试
 * @see modules/lms/composables/useClassModal.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  resetAllStubs,
  setMockI18n,
  setMockAuthUser,
  setMockLmsContext,
  setMockFetchHandler,
  getToastCalls,
} from '../../../../test/setup/nuxt-stubs'
import { ref } from 'vue'

beforeEach(async () => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
  setMockLmsContext(1, 0)
  setMockAuthUser(
    { id: 1, name: 'admin', defaultClass: { id: 10, name: 'Class A' } },
    [{ code: 'admin' }],
  )
  setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
  // useClassModal 依赖 useAuth, useClassUsers, useClasses, useLmsContext
  const { useClassUsers } = await import('../../composables/useClassUsers')
  ;(globalThis as any).useClassUsers = () => ({
    classUsers: ref([]),
    classUsersLoading: ref(false),
    students: ref([]),
    teachers: ref([]),
    fetchUsers: vi.fn(),
    clearUsers: vi.fn(),
  })
  ;(globalThis as any).useClasses = () => ({
    classes: ref([
      { id: 10, name: 'Class A' },
      { id: 11, name: 'Class B' },
    ]),
    classOptions: ref([
      { label: 'Class A', value: 10 },
      { label: 'Class B', value: 11 },
    ]),
    loadClasses: vi.fn(),
  })
})

describe('composables/useClassModal', () => {
  it('初始状态', async () => {
    const open = ref(false)
    const { useClassModal } = await import('../../composables/useClassModal')
    const r = useClassModal(open)
    expect(r.classLoading.value).toBe(false)
    expect(r.adding.value).toBe(false)
    expect(r.newClassName.value).toBe('')
    expect(r.selectedItem.value).toBeUndefined()
  })

  it('studentMode 仅非 admin 且无班级时为 true', async () => {
    setMockAuthUser({ id: 1, name: 'stu' }, [{ code: 'student' }])
    ;(globalThis as any).useClasses = () => ({
      classes: ref([]),
      classOptions: ref([]),
      loadClasses: vi.fn(),
    })
    const open = ref(false)
    const { useClassModal } = await import('../../composables/useClassModal')
    const r = useClassModal(open)
    expect(r.studentMode.value).toBe(true)
  })

  it('admin 有班级时 studentMode=false', async () => {
    const open = ref(false)
    const { useClassModal } = await import('../../composables/useClassModal')
    const r = useClassModal(open)
    expect(r.studentMode.value).toBe(false)
  })

  it('selectedClassId 来自 user.defaultClass', async () => {
    const open = ref(false)
    const { useClassModal } = await import('../../composables/useClassModal')
    const r = useClassModal(open)
    expect(r.selectedClassId.value).toBe(10)
  })

  it('classOptions 来自 classes 缓存', async () => {
    const open = ref(false)
    const { useClassModal } = await import('../../composables/useClassModal')
    const r = useClassModal(open)
    expect(r.classOptions.value.length).toBe(2)
    expect(r.classOptions.value[0].label).toBe('Class A')
  })

  it('isSelectedStudent / toggleStudentSelect / removeSelectedStudent', async () => {
    const open = ref(false)
    const { useClassModal } = await import('../../composables/useClassModal')
    const r = useClassModal(open)
    const user = { id: 5, name: 'stu5' }
    expect(r.isSelectedStudent(5)).toBe(false)
    r.toggleStudentSelect(user)
    expect(r.isSelectedStudent(5)).toBe(true)
    expect(r.selectedStudents.value.length).toBe(1)
    r.toggleStudentSelect(user) // 再次 toggle → 移除
    expect(r.isSelectedStudent(5)).toBe(false)
    r.toggleStudentSelect(user)
    r.removeSelectedStudent(5)
    expect(r.isSelectedStudent(5)).toBe(false)
  })

  it('isSelectedTeacher / toggleTeacherSelect / removeSelectedTeacher', async () => {
    const open = ref(false)
    const { useClassModal } = await import('../../composables/useClassModal')
    const r = useClassModal(open)
    const user = { id: 7, name: 'teacher7' }
    expect(r.isSelectedTeacher(7)).toBe(false)
    r.toggleTeacherSelect(user)
    expect(r.isSelectedTeacher(7)).toBe(true)
    r.toggleTeacherSelect(user)
    expect(r.isSelectedTeacher(7)).toBe(false)
    r.toggleTeacherSelect(user)
    r.removeSelectedTeacher(7)
    expect(r.isSelectedTeacher(7)).toBe(false)
  })

  it('onStudentSearchInput 空关键字清空结果', async () => {
    const open = ref(false)
    const { useClassModal } = await import('../../composables/useClassModal')
    const r = useClassModal(open)
    r.studentSearch.value = ''
    r.onStudentSearchInput()
    expect(r.studentSearchResults.value).toEqual([])
  })

  it('onTeacherSearchInput 空关键字清空结果', async () => {
    const open = ref(false)
    const { useClassModal } = await import('../../composables/useClassModal')
    const r = useClassModal(open)
    r.teacherSearch.value = ''
    r.onTeacherSearchInput()
    expect(r.teacherSearchResults.value).toEqual([])
  })

  it('onStudentSearchInput 有关键字时延迟搜索', async () => {
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/users/search')) {
        return { data: [{ id: 5, name: 'stu5' }], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const open = ref(false)
    const { useClassModal } = await import('../../composables/useClassModal')
    const r = useClassModal(open)
    r.studentSearch.value = 'stu'
    r.onStudentSearchInput()
    // 等待 300ms 延迟
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(r.studentSearchResults.value.length).toBe(1)
    expect(r.studentSearchResults.value[0].id).toBe(5)
  })

  it('addClass 空名字不调用', async () => {
    let called = false
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/classes/add')) called = true
      return { data: null, success: true, msg: '' }
    })
    const open = ref(false)
    const { useClassModal } = await import('../../composables/useClassModal')
    const r = useClassModal(open)
    r.newClassName.value = '  '
    await r.addClass()
    expect(called).toBe(false)
  })

  it('addClass 成功时 toast 提示', async () => {
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/classes/add')) {
        return { data: [{ id: 12, name: 'New Class' }], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const open = ref(false)
    const { useClassModal } = await import('../../composables/useClassModal')
    const r = useClassModal(open)
    r.newClassName.value = 'New Class'
    await r.addClass()
    const toasts = getToastCalls()
    expect(toasts.some((t) => t.color === 'success')).toBe(true)
    expect(r.newClassName.value).toBe('')
  })

  it('saveClassName 空名字不调用', async () => {
    let called = false
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/classes/update')) called = true
      return { data: null, success: true, msg: '' }
    })
    const open = ref(false)
    const { useClassModal } = await import('../../composables/useClassModal')
    const r = useClassModal(open)
    r.editClassName.value = ''
    await r.saveClassName()
    expect(called).toBe(false)
  })

  it('startEditClassName 从当前班级名填充', async () => {
    const open = ref(false)
    const { useClassModal } = await import('../../composables/useClassModal')
    const r = useClassModal(open)
    r.startEditClassName()
    expect(r.editClassName.value).toBe('Class A')
    expect(r.editingClassName.value).toBe(true)
  })

  it('cancelEditClassName 清空编辑状态', async () => {
    const open = ref(false)
    const { useClassModal } = await import('../../composables/useClassModal')
    const r = useClassModal(open)
    r.startEditClassName()
    r.cancelEditClassName()
    expect(r.editingClassName.value).toBe(false)
    expect(r.editClassName.value).toBe('')
  })

  it('addStudentsToClass 无选中时不调用', async () => {
    let called = false
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/classes/users')) called = true
      return { data: null, success: true, msg: '' }
    })
    const open = ref(false)
    const { useClassModal } = await import('../../composables/useClassModal')
    const r = useClassModal(open)
    await r.addStudentsToClass()
    expect(called).toBe(false)
  })

  it('addStudentsToClass 成功时 toast + 清空选中', async () => {
    setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
    const open = ref(false)
    const { useClassModal } = await import('../../composables/useClassModal')
    const r = useClassModal(open)
    r.toggleStudentSelect({ id: 5, name: 'stu5' })
    await r.addStudentsToClass()
    const toasts = getToastCalls()
    expect(toasts.some((t) => t.color === 'success')).toBe(true)
    expect(r.selectedStudents.value.length).toBe(0)
  })
})
