/**
 * useAuth composable 测试（happy-dom + nuxt-stubs）
 * @see modules/base/composables/useAuth.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
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

describe('composables/useAuth - 用户状态', () => {
  it('未登录时 user 为 null', async () => {
    setMockAuthUser(null)
    const { useAuth } = await import('../../composables/useAuth')
    const auth = useAuth()
    expect(auth.user.value).toBeNull()
    expect(auth.isLoggedIn.value).toBe(false)
  })

  it('登录后返回用户信息', async () => {
    setMockAuthUser(
      { id: 1, username: 'alice', name: 'Alice' },
      [{ code: 'admin', name: 'Admin' }],
      [{ code: 'read', name: 'Read' }],
    )
    const { useAuth } = await import('../../composables/useAuth')
    const auth = useAuth()
    expect(auth.user.value).toBeTruthy()
    expect(auth.user.value?.username).toBe('alice')
    expect(auth.roles.value).toHaveLength(1)
    expect(auth.roles.value[0].code).toBe('admin')
    expect(auth.permissions.value).toHaveLength(1)
    expect(auth.permissions.value[0].code).toBe('read')
    expect(auth.isLoggedIn.value).toBe(true)
  })

  it('hasRole 检查指定角色', async () => {
    setMockAuthUser(
      { id: 1, username: 'alice', name: 'Alice' },
      [{ code: 'admin', name: 'Admin' }, { code: 'teacher', name: 'Teacher' }],
    )
    const { useAuth } = await import('../../composables/useAuth')
    const auth = useAuth()
    expect(auth.hasRole('admin')).toBe(true)
    expect(auth.hasRole('teacher')).toBe(true)
    expect(auth.hasRole('student')).toBe(false)
  })

  it('hasAnyRole 检查多个角色', async () => {
    setMockAuthUser(
      { id: 1, username: 'alice', name: 'Alice' },
      [{ code: 'teacher', name: 'Teacher' }],
    )
    const { useAuth } = await import('../../composables/useAuth')
    const auth = useAuth()
    expect(auth.hasAnyRole(['admin', 'teacher'])).toBe(true)
    expect(auth.hasAnyRole(['admin', 'student'])).toBe(false)
  })

  it('hasPermission 检查权限', async () => {
    setMockAuthUser(
      { id: 1, username: 'alice', name: 'Alice' },
      [],
      [{ code: 'edit', name: 'Edit' }],
    )
    const { useAuth } = await import('../../composables/useAuth')
    const auth = useAuth()
    expect(auth.hasPermission('edit')).toBe(true)
    expect(auth.hasPermission('delete')).toBe(false)
  })
})

describe('composables/useAuth - 登录/注册/登出', () => {
  it('login 成功后调用 refreshUser', async () => {
    setMockAuthUser(null)
    setMockFetchHandler(async (url, opts: any) => {
      if (url === '/api/auth/login' && opts.method === 'POST') {
        return { data: { user: { id: 1, username: 'alice', name: 'Alice' }, token: 't' }, success: true, msg: '' }
      }
      if (url === '/api/auth/me') {
        return { data: { user: { id: 1, username: 'alice', name: 'Alice' }, roles: [], permissions: [] }, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useAuth } = await import('../../composables/useAuth')
    const auth = useAuth()
    const result = await auth.login('alice', 'pwd')
    expect(result.user.username).toBe('alice')
    expect(result.token).toBe('t')
  })

  it('register 传邮箱', async () => {
    setMockFetchHandler(async (url, opts: any) => {
      if (url === '/api/auth/register') {
        return { data: { user: { id: 1, username: 'bob', name: 'Bob' }, token: 't' }, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useAuth } = await import('../../composables/useAuth')
    const auth = useAuth()
    const result = await auth.register('bob', 'pwd', 'Bob', 'bob@example.com')
    expect(result.user.username).toBe('bob')
  })

  it('logout 清空用户', async () => {
    setMockFetchHandler(async (url, opts: any) => {
      if (url === '/api/auth/logout') {
        return { data: null, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useAuth } = await import('../../composables/useAuth')
    const auth = useAuth()
    await expect(auth.logout()).resolves.toBeUndefined()
  })
})
