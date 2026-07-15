/**
 * Notifications API endpoint tests
 * @see modules/base/server/api/notifications/*.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ====================== Mock @nuxthub/db ======================
const _mockDb = {
  select: vi.fn().mockReturnThis(),
  selectDistinct: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  offset: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
}
const _mockSchema = {
  notifys: {
    id: 'id', userId: 'userId', name: 'name', content: 'content',
    data: 'data', readAt: 'readAt', createdAt: 'createdAt',
  },
  messages: {
    id: 'id', receiverUserId: 'receiverUserId', readAt: 'readAt', deletedAt: 'deletedAt',
  },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
  setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
})

function makeEvent(opts: { query?: Record<string, any>; cookies?: Record<string, any> } = {}) {
  return { cookies: opts.cookies || {}, query: opts.query || {} } as any
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
}

describe('API: notifications/list.get', () => {
  beforeEach(resetChain)

  it('未登录返回 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/notifications/list.get')).default
    await expect(handler(makeEvent())).rejects.toThrow()
  })

  it('默认分页参数 page=1 pageSize=10', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn().mockReturnValue({
      offset: vi.fn().mockResolvedValue([
        { id: 1, userId: 1, name: '通知1', content: '内容', data: null, readAt: null, createdAt: new Date() },
      ]),
    })
    const handler = (await import('../../server/api/notifications/list.get')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data.page).toBe(1)
    expect(result.data.pageSize).toBe(10)
  })

  it('pageSize 上限 100', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn().mockReturnValue({
      offset: vi.fn().mockResolvedValue([]),
    })
    const handler = (await import('../../server/api/notifications/list.get')).default
    const result = await handler(makeEvent({ query: { pageSize: 999 } }))
    expect(result.data.pageSize).toBe(100)
  })

  it('page 最小为 1', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn().mockReturnValue({
      offset: vi.fn().mockResolvedValue([]),
    })
    const handler = (await import('../../server/api/notifications/list.get')).default
    const result = await handler(makeEvent({ query: { page: 0 } }))
    expect(result.data.page).toBe(1)
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
    // unread.get uses .select({total:count()}).from().where() chain (no limit)
    _mockDb.where = vi.fn().mockResolvedValue([{ total: 5 }, { total: 2 }])
    const handler = (await import('../../server/api/notifications/unread.get')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data.notifyUnread).toBeGreaterThanOrEqual(0)
  })
})
