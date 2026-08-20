/**
 * feedback API 端点测试
 * @see modules/base/server/api/feedback/*.ts
 *
 * 覆盖：
 * - list.get.ts 管理员分页列表（M 管理员视图数据源）
 * - add.post.ts 提交反馈
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const _mockDb = {
  query: {
    files: { findFirst: vi.fn() },
  },
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  offset: vi.fn(),
  leftJoin: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
}
const _mockSchema = {
  feedbacks: {
    id: 'id', name: 'name', type: 'type', content: 'content',
    userId: 'userId', createdAt: 'createdAt', deletedAt: 'deletedAt',
  },
  users: { id: 'id', name: 'name' },
  tokens: { name: 'name', userId: 'userId', deletedAt: 'deletedAt' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
  _mockDb.select = vi.fn().mockReturnThis()
  _mockDb.from = vi.fn().mockReturnThis()
  _mockDb.where = vi.fn().mockReturnThis()
  _mockDb.orderBy = vi.fn().mockReturnThis()
  _mockDb.leftJoin = vi.fn().mockReturnThis()
  _mockDb.limit = vi.fn().mockReturnThis()
  _mockDb.offset = vi.fn().mockReturnThis()
  _mockDb.insert = vi.fn().mockReturnThis()
  _mockDb.values = vi.fn().mockReturnThis()
  _mockDb.returning = vi.fn().mockResolvedValue([{}])
})

function makeEvent(query: Record<string, any> = {}) {
  return { cookies: {}, query, body: {} } as any
}

describe('API: feedback/list.get', () => {
  it('非管理员返回 403', async () => {
    setMockAuthState({ id: 2, username: 'student', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/feedback/list.get')).default
    await expect(handler(makeEvent({ page: '1' }))).rejects.toMatchObject({ statusCode: 403 })
  })

  it('管理员返回分页数据', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    // total 查询链：select().from().where()（where 终端）
    const totalChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 1 }]),
    }
    // 列表查询链：select().from().leftJoin().where().orderBy().limit().offset()（offset 终端）
    const listChain = {
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue([
        { id: 1, name: 'Bug report', type: 'bug', content: 'data:image/png;base64,abc', userId: 2, userName: 'Alice', createdAt: new Date() },
      ]),
    }
    _mockDb.select = vi.fn().mockReturnValueOnce(totalChain).mockReturnValueOnce(listChain)
    const handler = (await import('../../server/api/feedback/list.get')).default
    const result = await handler(makeEvent({ page: '1', pageSize: '10' }))
    expect(result.success).toBe(true)
    expect(result.data.data).toHaveLength(1)
    expect(result.data.total).toBe(1)
  })
})

describe('API: feedback/add.post', () => {
  it('缺少标题返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/feedback/add.post')).default
    const result = await handler(makeEvent({}))
    expect(result.success).toBe(false)
  })

  it('提交成功', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.returning = vi.fn().mockResolvedValue([{ id: 9, name: 'hello', type: 'bug' }])
    const handler = (await import('../../server/api/feedback/add.post')).default
    const result = await handler({ cookies: {}, query: {}, body: { name: 'hello', type: 'bug', content: 'x' } } as any)
    expect(result.success).toBe(true)
    expect(result.data.id).toBe(9)
  })
})
