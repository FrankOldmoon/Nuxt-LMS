/**
 * 安全响应头中间件测试
 * @see modules/base/server/middleware/security-headers.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// 记录 setResponseHeaders 调用
let headerCalls: Record<string, string>[] = []

beforeEach(() => {
  headerCalls = []
  ;(globalThis as any).setResponseHeaders = (_e: any, h: Record<string, string>) => { headerCalls.push(h) }
})

function makeEvent() {
  return {} as any
}

describe('Middleware: security-headers', () => {
  it('对所有响应添加防点击劫持头（M5）', async () => {
    const { default: handler } = await import('../../server/middleware/security-headers')
    await handler(makeEvent())
    expect(headerCalls).toHaveLength(1)
    const headers = headerCalls[0]
    expect(headers['X-Frame-Options']).toBe('SAMEORIGIN')
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'self'")
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
  })

  it('不阻断正常流程（不抛错）', async () => {
    const { default: handler } = await import('../../server/middleware/security-headers')
    expect(() => handler(makeEvent())).not.toThrow()
  })
})
