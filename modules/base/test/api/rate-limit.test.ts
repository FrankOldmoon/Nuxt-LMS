/**
 * 速率限制中间件测试
 * @see modules/base/server/middleware/rate-limit.ts
 *
 * 中间件使用模块级 Map 存储 IP 计数，每个测试用 vi.resetModules() 获取全新实例。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// 覆盖 getRequestIP 以返回可控 IP
function setMockRequestIP(ip: string | null) {
  ;(globalThis as any).getRequestIP = (_event: any, _opts?: any) => ip
}

function makeEvent(opts: { path?: string; method?: string } = {}) {
  return {
    path: opts.path || '/api/auth/login',
    method: opts.method || 'POST',
  } as any
}

describe('Middleware: rate-limit', () => {
  beforeEach(() => {
    vi.resetModules()
    // 重置为默认 stub（返回 null）
    setMockRequestIP(null)
  })

  it('非保护路径直接放行', async () => {
    const { default: handler } = await import('../../server/middleware/rate-limit')
    // 不应抛错
    await expect(handler(makeEvent({ path: '/api/users/list' }))).resolves.toBeUndefined()
  })

  it('保护路径在限额内放行', async () => {
    setMockRequestIP('1.2.3.4')
    const { default: handler } = await import('../../server/middleware/rate-limit')
    for (let i = 0; i < 5; i++) {
      await expect(handler(makeEvent({ path: '/api/auth/login' }))).resolves.toBeUndefined()
    }
  })

  it('超过限额抛 429', async () => {
    setMockRequestIP('1.2.3.5')
    const { default: handler } = await import('../../server/middleware/rate-limit')
    for (let i = 0; i < 5; i++) {
      await handler(makeEvent({ path: '/api/auth/login' }))
    }
    // 第 6 次应抛 429
    await expect(handler(makeEvent({ path: '/api/auth/login' }))).rejects.toMatchObject({
      statusCode: 429,
    })
  })

  it('不同 IP 独立计数', async () => {
    setMockRequestIP('1.2.3.6')
    const { default: handler } = await import('../../server/middleware/rate-limit')
    for (let i = 0; i < 5; i++) {
      await handler(makeEvent({ path: '/api/auth/login' }))
    }
    // 切换 IP，计数重置
    setMockRequestIP('1.2.3.7')
    await expect(handler(makeEvent({ path: '/api/auth/login' }))).resolves.toBeUndefined()
  })

  it('未知 IP（null）仍按同一桶计数', async () => {
    setMockRequestIP(null)
    const { default: handler } = await import('../../server/middleware/rate-limit')
    for (let i = 0; i < 5; i++) {
      await handler(makeEvent({ path: '/api/auth/forgot-password' }))
    }
    await expect(handler(makeEvent({ path: '/api/auth/forgot-password' }))).rejects.toMatchObject({
      statusCode: 429,
    })
  })

  it('保护 forgot-password 与 reset-password 端点', async () => {
    setMockRequestIP('1.2.3.8')
    const { default: handler } = await import('../../server/middleware/rate-limit')
    for (let i = 0; i < 5; i++) {
      await handler(makeEvent({ path: '/api/auth/reset-password' }))
    }
    await expect(handler(makeEvent({ path: '/api/auth/reset-password' }))).rejects.toMatchObject({
      statusCode: 429,
    })
  })
})
