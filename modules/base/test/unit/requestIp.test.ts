/**
 * clientIp 单元测试
 * @see modules/base/server/utils/requestIp.ts
 *
 * 生产是 nginx 反代，getRequestIP 只会拿到 127.0.0.1；
 * 必须优先 X-Real-IP（nginx $remote_addr，不可伪造），其次 X-Forwarded-For 最后一段。
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { clientIp } from '../../server/utils/requestIp'

const g = globalThis as any
const origHeader = g.getHeader
const origIp = g.getRequestIP

function mockHeaders(map: Record<string, string | undefined>) {
  g.getHeader = (_event: any, name: string) => map[String(name).toLowerCase()]
}

beforeEach(() => {
  mockHeaders({})
  g.getRequestIP = () => null
})
afterEach(() => {
  g.getHeader = origHeader
  g.getRequestIP = origIp
})

describe('utils/requestIp.clientIp', () => {
  it('优先 X-Real-IP', () => {
    mockHeaders({ 'x-real-ip': '203.0.113.7', 'x-forwarded-for': '1.1.1.1, 2.2.2.2' })
    expect(clientIp({})).toBe('203.0.113.7')
  })

  it('无 X-Real-IP 时取 X-Forwarded-For 最后一段（最靠近的代理看到的值）', () => {
    mockHeaders({ 'x-forwarded-for': '10.0.0.1, 203.0.113.9' })
    expect(clientIp({})).toBe('203.0.113.9')
  })

  it('没有代理头时回退 socket 地址', () => {
    g.getRequestIP = () => '127.0.0.1'
    expect(clientIp({})).toBe('127.0.0.1')
  })

  it('都取不到返回 null', () => {
    expect(clientIp({})).toBeNull()
  })

  it('X-Real-IP 带空格时 trim', () => {
    mockHeaders({ 'x-real-ip': '  203.0.113.7  ' })
    expect(clientIp({})).toBe('203.0.113.7')
  })
})
