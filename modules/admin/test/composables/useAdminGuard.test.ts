/**
 * useAdminGuard composable 测试
 * @see modules/admin/composables/useAdminGuard.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { resetAllStubs, setMockAuthUser, getToastCalls } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

describe('composables/useAdminGuard', () => {
  it('管理员 isAdmin 为 true', async () => {
    setMockAuthUser(
      { id: 1, username: 'admin', name: 'Admin' },
      [{ code: 'admin', name: 'Admin' }],
    )
    const { useAdminGuard } = await import('../../composables/useAdminGuard')
    const { isAdmin } = useAdminGuard()
    expect(isAdmin.value).toBe(true)
  })

  it('非管理员 isAdmin 为 false', async () => {
    setMockAuthUser(
      { id: 2, username: 'student', name: 'Student' },
      [{ code: 'student', name: 'Student' }],
    )
    const { useAdminGuard } = await import('../../composables/useAdminGuard')
    const { isAdmin } = useAdminGuard()
    expect(isAdmin.value).toBe(false)
  })

  it('assertAdmin 管理员返回 true 且不弹 toast', async () => {
    setMockAuthUser(
      { id: 1, username: 'admin', name: 'Admin' },
      [{ code: 'admin', name: 'Admin' }],
    )
    const { useAdminGuard } = await import('../../composables/useAdminGuard')
    const { assertAdmin } = useAdminGuard()
    expect(assertAdmin()).toBe(true)
    expect(getToastCalls()).toHaveLength(0)
  })

  it('assertAdmin 非管理员返回 false 并弹 error toast', async () => {
    setMockAuthUser(
      { id: 2, username: 'student', name: 'Student' },
      [{ code: 'student', name: 'Student' }],
    )
    const { useAdminGuard } = await import('../../composables/useAdminGuard')
    const { assertAdmin } = useAdminGuard()
    expect(assertAdmin()).toBe(false)
    const toasts = getToastCalls()
    expect(toasts).toHaveLength(1)
    expect(toasts[0].color).toBe('error')
  })

  it('adminMiddleware 非管理员/未登录跳回首页', async () => {
    setMockAuthUser(null)
    const mod = await import('../../composables/useAdminGuard')
    const navigateCalls: any[] = []
    ;(globalThis as any).navigateTo = (to: any) => { navigateCalls.push(to); return Promise.resolve() }
    // 未登录 → 跳转
    mod.adminMiddleware({} as any, {} as any)
    expect(navigateCalls).toHaveLength(1)
    expect(navigateCalls[0]).toBe('/')

    // 管理员 → 不跳转
    navigateCalls.length = 0
    setMockAuthUser(
      { id: 1, username: 'admin', name: 'Admin' },
      [{ code: 'admin', name: 'Admin' }],
    )
    mod.adminMiddleware({} as any, {} as any)
    expect(navigateCalls).toHaveLength(0)
  })
})
