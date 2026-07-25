/**
 * useCourseMembersManager composable 测试
 * @see modules/lms/composables/useCourseMembersManager.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  resetAllStubs,
  setMockI18n,
  setMockFetchHandler,
  getToastCalls,
} from '../../../../test/setup/nuxt-stubs'
import { ref } from 'vue'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
})

describe('composables/useCourseMembersManager', () => {
  it('初始状态：空数组、空关键字', async () => {
    const { useCourseMembersManager } = await import('../../composables/useCourseMembersManager')
    const r = useCourseMembersManager({ courseId: 1 })
    expect(r.members.value).toEqual([])
    expect(r.memberSearchKeyword.value).toBe('')
    expect(r.searchResults.value).toEqual([])
    expect(r.memberUpdating.value).toBeNull()
    expect(r.teachers.value).toEqual([])
    expect(r.editors.value).toEqual([])
  })

  it('loadMembers 拉取并按角色拆分 teachers/editors', async () => {
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/courses/members?')) {
        return {
          data: [
            { userId: 1, isTeacher: true, isEditor: false },
            { userId: 2, isTeacher: false, isEditor: true },
            { userId: 3, isTeacher: true, isEditor: true },
          ],
          success: true,
          msg: '',
        }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useCourseMembersManager } = await import('../../composables/useCourseMembersManager')
    const r = useCourseMembersManager({ courseId: 1 })
    await r.loadMembers()
    expect(r.members.value).toHaveLength(3)
    expect(r.teachers.value).toHaveLength(2) // userId 1 和 3
    expect(r.editors.value).toHaveLength(2) // userId 2 和 3
  })

  it('loadMembers 失败时 members 设为空数组', async () => {
    setMockFetchHandler(async () => ({ data: null, success: false, msg: 'fail' }))
    const { useCourseMembersManager } = await import('../../composables/useCourseMembersManager')
    const r = useCourseMembersManager({ courseId: 1 })
    await r.loadMembers()
    expect(r.members.value).toEqual([])
  })

  it('isMemberRole 返回正确角色状态', async () => {
    setMockFetchHandler(async () => ({
      data: [
        { userId: 1, isTeacher: true, isEditor: false },
        { userId: 2, isTeacher: false, isEditor: true },
      ],
      success: true,
      msg: '',
    }))
    const { useCourseMembersManager } = await import('../../composables/useCourseMembersManager')
    const r = useCourseMembersManager({ courseId: 1 })
    await r.loadMembers()
    expect(r.isMemberRole(1, 'teacher')).toBe(true)
    expect(r.isMemberRole(1, 'editor')).toBe(false)
    expect(r.isMemberRole(2, 'teacher')).toBe(false)
    expect(r.isMemberRole(2, 'editor')).toBe(true)
    expect(r.isMemberRole(999, 'teacher')).toBe(false)
  })

  it('searchUsers 空关键字时清空结果', async () => {
    const { useCourseMembersManager } = await import('../../composables/useCourseMembersManager')
    const r = useCourseMembersManager({ courseId: 1 })
    r.searchResults.value = [{ id: 1, name: 'a' }]
    r.memberSearchKeyword.value = ''
    await r.searchUsers()
    expect(r.searchResults.value).toEqual([])
  })

  it('searchUsers 关键字有效时返回结果并过滤已是 teacher+editor 的', async () => {
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/courses/members-search')) {
        return {
          data: [
            { id: 10, name: 'alice' },
            { id: 20, name: 'bob' }, // 已是 teacher+editor，应过滤掉
            { id: 30, name: 'carol' },
          ],
          success: true,
          msg: '',
        }
      }
      if (url.includes('/api/courses/members?')) {
        return {
          data: [{ userId: 20, isTeacher: true, isEditor: true }],
          success: true,
          msg: '',
        }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useCourseMembersManager } = await import('../../composables/useCourseMembersManager')
    const r = useCourseMembersManager({ courseId: 1 })
    await r.loadMembers()
    r.memberSearchKeyword.value = 'a'
    await r.searchUsers()
    expect(r.searchResults.value).toHaveLength(2)
    expect(r.searchResults.value.map((u: any) => u.id)).toEqual([10, 30])
  })

  it('addMember 成功后重新 loadMembers 并刷新 searchResults', async () => {
    let addCalled = false
    let membersCallCount = 0
    setMockFetchHandler(async (url, opts: any) => {
      if (url === '/api/courses/members' && opts?.method === 'POST') {
        addCalled = true
        return { data: null, success: true, msg: '' }
      }
      if (url.includes('/api/courses/members?')) {
        membersCallCount++
        return {
          data: [{ userId: 5, isTeacher: true, isEditor: false }],
          success: true,
          msg: '',
        }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useCourseMembersManager } = await import('../../composables/useCourseMembersManager')
    const r = useCourseMembersManager({ courseId: 1 })
    r.searchResults.value = [{ id: 5, name: 'a' }, { id: 6, name: 'b' }]
    await r.addMember(5, 'teacher')
    expect(addCalled).toBe(true)
    expect(membersCallCount).toBeGreaterThanOrEqual(1)
    expect(r.memberUpdating.value).toBeNull()
    // addMember 之后 searchResults 仍保留全部：5 现在是 teacher 但不是 editor，仍可被加为 editor
    expect(r.searchResults.value).toHaveLength(2)
  })

  it('addMember 失败时 toast 报错', async () => {
    setMockFetchHandler(async (url, opts: any) => {
      if (url === '/api/courses/members' && opts?.method === 'POST') {
        return { data: null, success: false, msg: 'no perm' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useCourseMembersManager } = await import('../../composables/useCourseMembersManager')
    const r = useCourseMembersManager({ courseId: 1 })
    await r.addMember(5, 'teacher')
    const toasts = getToastCalls()
    expect(toasts.some((t) => t.color === 'error')).toBe(true)
    expect(r.memberUpdating.value).toBeNull()
  })

  it('removeMember 成功后 toast 提示', async () => {
    setMockFetchHandler(async (url, opts: any) => {
      if (url === '/api/courses/members' && opts?.method === 'POST') {
        return { data: null, success: true, msg: '' }
      }
      if (url.includes('/api/courses/members?')) {
        return { data: [], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useCourseMembersManager } = await import('../../composables/useCourseMembersManager')
    const r = useCourseMembersManager({ courseId: 1 })
    await r.removeMember(5, 'teacher')
    const toasts = getToastCalls()
    expect(toasts.some((t) => t.color === 'success')).toBe(true)
  })

  it('memberSearchKeyword 变化触发 searchUsers', async () => {
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/courses/members-search')) {
        return { data: [{ id: 1, name: 'a' }], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useCourseMembersManager } = await import('../../composables/useCourseMembersManager')
    const r = useCourseMembersManager({ courseId: 1 })
    r.memberSearchKeyword.value = 'alice'
    await new Promise((resolve) => setTimeout(resolve, 0))
    // watch 是同步触发的（无显式 flush），keyword 变化即触发 searchUsers
    // 注意：searchUsers 是 async，需要 await microtask
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(r.searchResults.value.length).toBeGreaterThan(0)
  })
})
