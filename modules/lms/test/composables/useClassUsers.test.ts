/**
 * useClassUsers composable 测试
 * @see modules/lms/composables/useClassUsers.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  resetAllStubs,
  setMockI18n,
  setMockFetchHandler,
} from '../../../../test/setup/nuxt-stubs'
import { ref } from 'vue'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
})

describe('composables/useClassUsers', () => {
  it('初始状态：students/teachers 为空，classUsers 为空数组', async () => {
    const { useClassUsers } = await import('../../composables/useClassUsers')
    const r = useClassUsers()
    expect(r.classUsers.value).toEqual([])
    expect(r.students.value).toEqual([])
    expect(r.teachers.value).toEqual([])
    expect(r.classUsersLoading.value).toBe(false)
    expect(r.currentClassId.value).toBeNull()
  })

  it('fetchUsers classId 为 null/0 时清空数据', async () => {
    const { useClassUsers } = await import('../../composables/useClassUsers')
    const r = useClassUsers()
    r.classUsers.value = [{ id: 1, name: 'a', isTeacher: false }]
    await r.fetchUsers(0, 1)
    expect(r.classUsers.value).toEqual([])
    expect(r.currentClassId.value).toBeNull()
  })

  it('fetchUsers 拉取并按 isTeacher 拆分 students / teachers', async () => {
    setMockFetchHandler(async () => ({
      data: [
        { id: 1, name: 'student1', isTeacher: false },
        { id: 2, name: 'teacher1', isTeacher: true },
        { id: 3, name: 'student2', isTeacher: false },
      ],
      success: true,
      msg: '',
    }))
    const { useClassUsers } = await import('../../composables/useClassUsers')
    const r = useClassUsers()
    await r.fetchUsers(10, 5)
    expect(r.classUsers.value).toHaveLength(3)
    expect(r.students.value).toHaveLength(2)
    expect(r.teachers.value).toHaveLength(1)
    expect(r.students.value[0].name).toBe('student1')
    expect(r.teachers.value[0].name).toBe('teacher1')
    expect(r.classUsersLoading.value).toBe(false)
    expect(r.currentClassId.value).toBe('10:5')
  })

  it('fetchUsers 命中缓存（同 classId:courseId 且已有数据）时跳过请求', async () => {
    let callCount = 0
    setMockFetchHandler(async () => {
      callCount++
      return { data: [{ id: 1, name: 'a', isTeacher: false }], success: true, msg: '' }
    })
    const { useClassUsers } = await import('../../composables/useClassUsers')
    const r = useClassUsers()
    await r.fetchUsers(10, 5)
    expect(callCount).toBe(1)
    await r.fetchUsers(10, 5) // 同样的 cacheKey，跳过
    expect(callCount).toBe(1)
  })

  it('fetchUsers 失败时清空 classUsers', async () => {
    setMockFetchHandler(async () => ({ data: null, success: false, msg: 'fail' }))
    const { useClassUsers } = await import('../../composables/useClassUsers')
    const r = useClassUsers()
    await r.fetchUsers(10, 5)
    expect(r.classUsers.value).toEqual([])
    expect(r.classUsersLoading.value).toBe(false)
  })

  it('clearUsers 清空 classUsers + currentClassId', async () => {
    const { useClassUsers } = await import('../../composables/useClassUsers')
    const r = useClassUsers()
    r.classUsers.value = [{ id: 1, name: 'a', isTeacher: false }]
    r.currentClassId.value = '1:1'
    r.clearUsers()
    expect(r.classUsers.value).toEqual([])
    expect(r.currentClassId.value).toBeNull()
  })

  it('fetchUsers 无 courseId 时使用简化 URL', async () => {
    let capturedUrl = ''
    setMockFetchHandler(async (url) => {
      capturedUrl = url
      return { data: [], success: true, msg: '' }
    })
    const { useClassUsers } = await import('../../composables/useClassUsers')
    const r = useClassUsers()
    await r.fetchUsers(10, 0)
    expect(capturedUrl).toBe('/api/classes/users?classId=10')
  })

  it('跨调用共享同一 state', async () => {
    const { useClassUsers } = await import('../../composables/useClassUsers')
    const a = useClassUsers()
    const b = useClassUsers()
    expect(a.classUsers).toBe(b.classUsers) // 同一 ref 引用
    a.classUsers.value = [{ id: 1, name: 'a', isTeacher: false }]
    expect(b.classUsers.value).toHaveLength(1)
  })
})
