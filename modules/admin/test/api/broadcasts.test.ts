/**
 * Admin 广播阅读率 API 测试
 * @see modules/admin/server/api/admin/broadcasts.get.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

let _rows: any[] = []

function makeChain(): any {
  const chain: any = {
    from: () => chain,
    where: () => chain,
    leftJoin: () => chain,
    groupBy: () => chain,
    orderBy: () => chain,
    limit: () => chain,
    then: (resolve: any) => Promise.resolve(_rows).then(resolve),
  }
  return chain
}

const _mockDb = { select: vi.fn(() => makeChain()) }
const _mockSchema: Record<string, any> = new Proxy({}, {
  get: (_t, table: string) => new Proxy({}, { get: (_t2, col: string) => `${table}.${col}` }),
})

vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))
vi.mock('drizzle-orm', () => {
  const sql = (strings: TemplateStringsArray, ...vals: any[]) => {
    const obj = { __sql: true, strings, vals, as: (alias: string) => ({ ...obj, alias }) }
    return obj
  }
  return {
    sql,
    isNull: (col: any) => ({ op: 'isNull', col }),
    eq: (col: any, val: any) => ({ op: 'eq', col, val }),
    desc: (col: any) => ({ op: 'desc', col }),
  }
})

import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
  _rows = []
})

function makeEvent(query: Record<string, any> = {}) {
  return { cookies: {}, query } as any
}

describe('API: admin/broadcasts.get', () => {
  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/admin/broadcasts.get')).default
    await expect(handler(makeEvent())).rejects.toThrow()
  })

  it('非管理员抛 403', async () => {
    setMockAuthState({ id: 2, username: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/admin/broadcasts.get')).default
    await expect(handler(makeEvent())).rejects.toThrow()
  })

  it('管理员返回广播列表与阅读率', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    _rows = [
      { id: 1, name: '停课通知', content: { text: '明天停课' }, audience: 3, createdBy: 1, createdAt: '2026-09-01T00:00:00Z', delivered: 3, readCount: 2 },
      { id: 2, name: '全勤', content: null, audience: 0, createdBy: 1, createdAt: '2026-09-02T00:00:00Z', delivered: 0, readCount: 0 },
    ]
    const handler = (await import('../../server/api/admin/broadcasts.get')).default
    const r = await handler(makeEvent())

    expect(r.success).toBe(true)
    expect(r.data.items).toHaveLength(2)
    expect(r.data.items[0]).toMatchObject({
      id: 1,
      name: '停课通知',
      text: '明天停课',
      audience: 3,
      delivered: 3,
      readCount: 2,
      readRate: 66.7,
    })
    // 送达为 0 时阅读率按 0 处理，不产生 NaN
    expect(r.data.items[1].readRate).toBe(0)
  })

  it('空数据返回空数组', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    _rows = []
    const handler = (await import('../../server/api/admin/broadcasts.get')).default
    const r = await handler(makeEvent())
    expect(r.data.items).toEqual([])
  })
})
