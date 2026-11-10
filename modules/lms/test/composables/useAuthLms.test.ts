/**
 * useAuthLms composable 测试
 * @see modules/lms/composables/useAuthLms.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import {
  resetAllStubs,
  setMockAuthUser,
  setMockFetchHandler,
  clearMockFetchHandler,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  clearMockFetchHandler()
})

describe('composables/useAuthLms', () => {
  it('初始 isLoggedIn=false, user=null', async () => {
    const { useAuthLms } = await import('../../composables/useAuthLms')
    const auth = useAuthLms()
    await flushPromises()
    expect(auth.isLoggedIn.value).toBe(false)
    expect(auth.user.value).toBeNull()
    expect(auth.roles.value).toEqual([])
  })

  it('登录后 isLoggedIn=true, hasRole 生效', async () => {
    // useAuthLms 复用 useAuth，LMS 扩展字段（editorCourseIds 等）通过
    // setMockAuthUser 的第 4 个参数 extra 注入，模拟 server runOnMeEnrich
    setMockAuthUser(
      { id: 1, username: 'alice', name: 'Alice' },
      [{ code: 'teacher', name: 'Teacher' }],
      [{ code: 'edit-course', name: 'Edit Course' }],
      { editorCourseIds: [1, 2], teacherCourseIds: [3], classIds: [10] }
    )
    const { useAuthLms } = await import('../../composables/useAuthLms')
    const auth = useAuthLms()
    await flushPromises()
    expect(auth.isLoggedIn.value).toBe(true)
    expect(auth.user.value?.username).toBe('alice')
    expect(auth.hasRole('teacher')).toBe(true)
    expect(auth.hasRole('admin')).toBe(false)
    expect(auth.hasAnyRole(['admin', 'teacher'])).toBe(true)
    expect(auth.hasPermission('edit-course')).toBe(true)
    expect(auth.isCourseEditor(1)).toBe(true)
    expect(auth.isCourseEditor(99)).toBe(false)
    expect(auth.isCourseTeacher(3)).toBe(true)
    expect(auth.isCourseTeacher(1)).toBe(true) // editor 包含 teacher 权限
    // 写权限：strict 课程身份，teacher/editor 课程都算
    expect(auth.isCourseStaff(3)).toBe(true)
    expect(auth.isCourseStaff(1)).toBe(true)
    expect(auth.isCourseStaff(99)).toBe(false)
    expect(auth.canEditCourse(3)).toBe(true)
    expect(auth.canEditCourse(99)).toBe(false)
  })

  it('observer 视为所有课程的观察教师（只读），但没有任何写权限', async () => {
    setMockAuthUser(
      { id: 2, username: 'obs', name: 'Obs' },
      [{ code: 'observer', name: 'Observer' }],
      [],
      { editorCourseIds: [], teacherCourseIds: [], classIds: [] }
    )
    const { useAuthLms } = await import('../../composables/useAuthLms')
    const auth = useAuthLms()
    await flushPromises()
    expect(auth.hasRole('observer')).toBe(true)
    expect(auth.isCourseTeacher(999)).toBe(true) // 全局教师视角，不依赖课程身份
    expect(auth.isCourseEditor(999)).toBe(false) // 非 editor
    // 写权限必须为 false：否则会出现「编辑按钮可点、保存 403」
    expect(auth.isCourseStaff(999)).toBe(false)
    expect(auth.canEditCourse(999)).toBe(false)
  })

  it('observer 即使被误配成本课程教师，canEditCourse 仍为 false（只读优先）', async () => {
    setMockAuthUser(
      { id: 3, username: 'obs2', name: 'Obs2' },
      [{ code: 'observer', name: 'Observer' }],
      [],
      { editorCourseIds: [], teacherCourseIds: [5], classIds: [] }
    )
    const { useAuthLms } = await import('../../composables/useAuthLms')
    const auth = useAuthLms()
    await flushPromises()
    expect(auth.isCourseStaff(5)).toBe(true) // 课程身份客观存在
    expect(auth.canEditCourse(5)).toBe(false) // 但 observer 只读
  })

  it('login 调用 /api/auth/login 并 refresh', async () => {
    let loginCalled = false
    setMockFetchHandler(async (url, opts: any) => {
      if (url === '/api/auth/login' && opts.method === 'POST') {
        loginCalled = true
        return { data: { user: { id: 1, username: 'alice' }, token: 'tok' }, success: true, msg: '' }
      }
      if (url === '/api/auth/me') {
        return { data: { user: { id: 1, username: 'alice' }, roles: [], permissions: [], editorCourseIds: [], teacherCourseIds: [], classIds: [] }, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useAuthLms } = await import('../../composables/useAuthLms')
    const auth = useAuthLms()
    await flushPromises()
    const result = await auth.login('alice', 'pwd')
    expect(loginCalled).toBe(true)
    expect((result as any).token).toBe('tok')
  })

  it('logout 清空状态', async () => {
    let logoutCalled = false
    setMockFetchHandler(async (url, opts: any) => {
      if (url === '/api/auth/logout' && opts.method === 'POST') {
        logoutCalled = true
        return { data: null, success: true, msg: '' }
      }
      if (url === '/api/auth/me') {
        return { data: { user: { id: 1, username: 'a' }, roles: [], permissions: [], editorCourseIds: [], teacherCourseIds: [], classIds: [] }, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useAuthLms } = await import('../../composables/useAuthLms')
    const auth = useAuthLms()
    await flushPromises()
    await auth.logout()
    expect(logoutCalled).toBe(true)
  })
})
