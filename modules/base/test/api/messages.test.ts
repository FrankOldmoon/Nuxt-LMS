/**
 * Messages API 端点测试
 * @see modules/base/server/api/messages/*.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const _mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
}
const _mockSchema = {
  messages: {
    id: 'id', name: 'name', content: 'content',
    senderUserId: 'senderUserId', receiverUserId: 'receiverUserId',
    readAt: 'readAt', deletedAt: 'deletedAt', createdAt: 'createdAt',
  },
  users: { id: 'id', name: 'name', avatarImg: 'avatarImg', classId: 'classId' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

// Mock ws/state so sendToUser can be recorded
const _sentToUser: any[] = []
vi.mock('../../server/utils/ws/state', () => ({
  broadcastToAll: () => {},
  sendToUser: (userId: number, msg: any) => { _sentToUser.push({ userId, msg }) },
  trackPeer: () => {},
  untrackPeer: () => {},
  userPeers: new Map(),
  allPeers: new Set(),
}))

import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
  _sentToUser.length = 0
})

function makeEvent(opts: { query?: Record<string, any>; body?: any } = {}) {
  return { cookies: {}, query: opts.query || {}, body: opts.body } as any
}

function resetChain() {
  _mockDb.select = vi.fn().mockReturnThis()
  _mockDb.from = vi.fn().mockReturnThis()
  _mockDb.where = vi.fn().mockReturnThis()
  _mockDb.orderBy = vi.fn().mockReturnThis()
  _mockDb.limit = vi.fn().mockReturnThis()
  _mockDb.insert = vi.fn().mockReturnThis()
  _mockDb.values = vi.fn().mockReturnThis()
  _mockDb.update = vi.fn().mockReturnThis()
  _mockDb.set = vi.fn().mockReturnThis()
}

describe('API: messages/list.get', () => {
  beforeEach(resetChain)

  it('未登录返回 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/messages/list.get')).default
    await expect(handler(makeEvent({ query: { userId: 2 } }))).rejects.toThrow()
  })

  it('缺少 userId 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/messages/list.get')).default
    const result = await handler(makeEvent({ query: {} }))
    expect(result.success).toBe(false)
  })

  it('登录后返回聊天记录', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.orderBy = vi.fn().mockResolvedValue([
      { id: 1, senderUserId: 1, receiverUserId: 2, content: 'Hi', createdAt: new Date() },
    ])
    const handler = (await import('../../server/api/messages/list.get')).default
    const result = await handler(makeEvent({ query: { userId: 2 } }))
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
  })
})

describe('API: messages/conversations.get', () => {
  beforeEach(resetChain)

  it('未登录返回 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/messages/conversations.get')).default
    await expect(handler(makeEvent())).rejects.toThrow()
  })

  it('登录后无消息返回空数组', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.orderBy = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/messages/conversations.get')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data).toEqual([])
  })

  it('登录后返回会话列表', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const now = new Date()
    _mockDb.orderBy = vi.fn().mockResolvedValue([
      { id: 1, senderUserId: 1, receiverUserId: 2, content: 'Hello', readAt: null, createdAt: now },
      { id: 2, senderUserId: 2, receiverUserId: 1, content: 'World', readAt: null, createdAt: now },
    ])
    _mockDb.where = vi.fn()
      .mockReturnValueOnce(_mockDb) // for messages orderBy
      .mockResolvedValueOnce([{ id: 2, name: 'Bob', avatarImg: 'a.png' }])
    const handler = (await import('../../server/api/messages/conversations.get')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
  })
})

describe('API: messages/send.post', () => {
  beforeEach(resetChain)

  it('未登录返回 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/messages/send.post')).default
    await expect(handler(makeEvent({ body: { receiverUserId: 2, content: 'X' } }))).rejects.toThrow()
  })

  it('登录后发送消息', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.returning = vi.fn().mockResolvedValue([{ id: 100, senderUserId: 1, receiverUserId: 2, content: 'X' }])
    const handler = (await import('../../server/api/messages/send.post')).default
    const result = await handler(makeEvent({ body: { receiverUserId: 2, content: 'Hello' } }))
    expect(result.success).toBe(true)
  })

  it('缺少 receiverUserId 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/messages/send.post')).default
    const result = await handler(makeEvent({ body: { content: 'X' } }))
    expect(result.success).toBe(false)
  })
})
