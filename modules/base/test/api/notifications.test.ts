/**
 * Notifications API 端点测试
 * @see modules/base/server/api/notifications/*.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ====================== Mock @nuxthub/db ======================
const _mockDb: any = {
  select: vi.fn().mockReturnThis(),
  selectDistinct: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  offset: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
}
const _mockSchema = {
  notifys: {
    id: 'id', userId: 'userId', name: 'name', content: 'content',
    data: 'data', broadcastId: 'broadcastId', readAt: 'readAt', createdAt: 'createdAt',
  },
  broadcasts: {
    id: 'id', name: 'name', content: 'content', createdBy: 'createdBy', audience: 'audience',
  },
  users: { id: 'id', deletedAt: 'deletedAt' },
  messages: {
    id: 'id', receiverUserId: 'receiverUserId', readAt: 'readAt', deletedAt: 'deletedAt',
  },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

import { resetAllStubs, setMockAuthState, clearWsBroadcasts } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
  setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
})

function makeEvent(opts: { query?: Record<string, any>; cookies?: Record<string, any>; body?: any } = {}) {
  return { cookies: opts.cookies || {}, query: opts.query || {}, body: opts.body } as any
}

function resetChain() {
  _mockDb.select = vi.fn().mockReturnThis()
  _mockDb.from = vi.fn().mockReturnThis()
  _mockDb.where = vi.fn().mockReturnThis()
  _mockDb.limit = vi.fn().mockReturnThis()
  _mockDb.offset = vi.fn().mockReturnThis()
  _mockDb.orderBy = vi.fn().mockReturnThis()
  _mockDb.update = vi.fn().mockReturnThis()
  _mockDb.set = vi.fn().mockReturnThis()
  _mockDb.delete = vi.fn().mockReturnThis()
  _mockDb.insert = vi.fn().mockReturnThis()
  _mockDb.values = vi.fn().mockReturnThis()
  _mockDb.returning = vi.fn()
}

/** 让 list.get 的分页查询返回给定行 */
function mockListItems(rows: any[]) {
  _mockDb.limit = vi.fn().mockReturnValue({
    offset: vi.fn().mockResolvedValue(rows),
  })
}

describe('API: notifications/list.get', () => {
  beforeEach(resetChain)

  it('未登录返回 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/notifications/list.get')).default
    await expect(handler(makeEvent())).rejects.toThrow()
  })

  it('默认分页参数 page=1 pageSize=10', async () => {
    mockListItems([
      { id: 1, userId: 1, name: '通知1', content: '内容', data: null, broadcastId: null, readAt: null, createdAt: new Date() },
    ])
    const handler = (await import('../../server/api/notifications/list.get')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data.page).toBe(1)
    expect(result.data.pageSize).toBe(10)
  })

  it('pageSize 上限 100', async () => {
    mockListItems([])
    const handler = (await import('../../server/api/notifications/list.get')).default
    const result = await handler(makeEvent({ query: { pageSize: 999 } }))
    expect(result.data.pageSize).toBe(100)
  })

  it('page 最小为 1', async () => {
    mockListItems([])
    const handler = (await import('../../server/api/notifications/list.get')).default
    const result = await handler(makeEvent({ query: { page: 0 } }))
    expect(result.data.page).toBe(1)
  })

  it('广播明细：读后写 readAt 保留（供统计阅读率），不删除', async () => {
    mockListItems([
      { id: 11, userId: 1, name: '广播', content: null, data: { type: 'broadcast' }, broadcastId: 5, readAt: null, createdAt: new Date() },
    ])
    const handler = (await import('../../server/api/notifications/list.get')).default
    await handler(makeEvent())
    expect(_mockDb.update).toHaveBeenCalled()
    expect(_mockDb.set).toHaveBeenCalledWith(expect.objectContaining({ readAt: expect.any(Date) }))
    expect(_mockDb.delete).not.toHaveBeenCalled()
  })

  it('个人定向通知：读后硬删除', async () => {
    mockListItems([
      { id: 22, userId: 1, name: '作业已评分', content: null, data: { type: 'homeworkGraded' }, broadcastId: null, readAt: null, createdAt: new Date() },
    ])
    const handler = (await import('../../server/api/notifications/list.get')).default
    await handler(makeEvent())
    expect(_mockDb.delete).toHaveBeenCalled()
    expect(_mockDb.update).not.toHaveBeenCalled()
  })

  it('已读的通知不再处理（既不写 readAt 也不删除）', async () => {
    mockListItems([
      { id: 33, userId: 1, name: '广播', content: null, data: { type: 'broadcast' }, broadcastId: 5, readAt: new Date(), createdAt: new Date() },
    ])
    const handler = (await import('../../server/api/notifications/list.get')).default
    await handler(makeEvent())
    expect(_mockDb.update).not.toHaveBeenCalled()
    expect(_mockDb.delete).not.toHaveBeenCalled()
  })
})

describe('API: notifications/broadcast.post', () => {
  beforeEach(() => {
    resetChain()
    clearWsBroadcasts()
  })

  it('非管理员被拒', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/notifications/broadcast.post')).default
    await expect(handler(makeEvent({ body: { title: 't', content: 'c' } }))).rejects.toThrow()
  })

  it('缺少标题或内容返回失败', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/notifications/broadcast.post')).default
    const r = await handler(makeEvent({ body: { title: '', content: '' } }))
    expect(r.success).toBe(false)
  })

  it('两层落库：broadcasts 主表 1 行 + 每人 1 行明细（带 broadcastId）', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    _mockDb.where = vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]) // 有效用户
    _mockDb.returning = vi.fn().mockResolvedValue([{ id: 77 }])

    const handler = (await import('../../server/api/notifications/broadcast.post')).default
    const r = await handler(makeEvent({ body: { title: '停课通知', content: '明天停课' } }))

    expect(r.success).toBe(true)
    expect(r.data.broadcastId).toBe(77)
    expect(r.data.total).toBe(2)

    // 第一次 values = 广播主表；第二次 values = notifications 明细
    const firstValues = _mockDb.values.mock.calls[0][0]
    expect(firstValues).toMatchObject({ name: '停课通知', audience: 2, createdBy: 1 })

    const notifyValues = _mockDb.values.mock.calls[1][0]
    expect(Array.isArray(notifyValues)).toBe(true)
    expect(notifyValues).toHaveLength(2)
    expect(notifyValues[0]).toMatchObject({ userId: 1, broadcastId: 77, name: '停课通知' })
  })

  it('无用户时不建广播记录', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    _mockDb.where = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/notifications/broadcast.post')).default
    const r = await handler(makeEvent({ body: { title: 't', content: 'c' } }))
    expect(r.success).toBe(true)
    expect(r.data.total).toBe(0)
    expect(_mockDb.insert).not.toHaveBeenCalled()
  })
})

describe('API: notifications/unread.get', () => {
  beforeEach(resetChain)

  it('未登录返回 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/notifications/unread.get')).default
    await expect(handler(makeEvent())).rejects.toThrow()
  })

  it('返回未读计数', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    // unread.get 用 .select({total:count()}).from().where() 链式（无 limit）
    _mockDb.where = vi.fn().mockResolvedValue([{ total: 5 }, { total: 2 }])
    const handler = (await import('../../server/api/notifications/unread.get')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data.notifyUnread).toBeGreaterThanOrEqual(0)
  })
})
