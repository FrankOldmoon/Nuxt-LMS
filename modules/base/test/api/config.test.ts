/**
 * Config API 端点测试
 * @see modules/base/server/api/config/*.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const _mockDb = {
  select: vi.fn().mockReturnThis(),
  selectDistinct: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  set: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
  onConflictDoNothing: vi.fn().mockReturnThis(),
}
const _mockSchema = {
  configs: { id: 'id', value: 'value' },
  tokens: { name: 'name', userId: 'userId', deletedAt: 'deletedAt' },
  users: { id: 'id', username: 'username' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

// Mock ws/state so broadcastToAll actually records calls
const _mockBroadcasts: any[] = []
vi.mock('../../server/utils/ws/state', () => ({
  broadcastToAll: (msg: any) => { _mockBroadcasts.push(msg) },
  sendToUser: () => {},
  trackPeer: () => {},
  untrackPeer: () => {},
  userPeers: new Map(),
  allPeers: new Set(),
}))

// Mock config/reload so getConfig reads from our controlled store
// (endpoints explicitly import getConfig/reloadConfig from config/reload;
//  upsertConfig is auto-imported via globalThis stub → _mockConfigStore)
let _configStore: Record<string, any> = {}
vi.mock('../../server/utils/config/reload', () => ({
  getConfig: async (key: string) => _configStore[key] ?? null,
  reloadConfig: async () => ({}),
}))

import {
  resetAllStubs,
  setMockAuthState,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
  _configStore = {}
  _mockBroadcasts.length = 0
})

function makeEvent(body: any = undefined) {
  return { cookies: {}, body, query: {} } as any
}

describe('API: config/get.get', () => {
  it('公开端点：返回站点配置安全子集', async () => {
    _configStore = {
      'site:title': 'MyLMS',
      'site:description': 'desc',
      'site:logo': 'logo.png',
      'site:favicon': 'fav.ico',
      'site:footerText': 'Footer',
      'site:defaultLocale': 'zh',
      'site:pageSize': 20,
      'site:allowRegistration': true,
      'site:allowForgotPassword': true,
      'site:maintenanceMode': false,
      'site:showNotify': true,
      'site:showMsg': true,
      'site:showMyFiles': true,
    }
    const handler = (await import('../../server/api/config/get.get')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data.siteTitle).toBe('MyLMS')
    expect(result.data.allowRegistration).toBe(true)
    expect(result.data.showMyFiles).toBe(true)
  })

  it('空配置时所有字段为 null', async () => {
    const handler = (await import('../../server/api/config/get.get')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data.siteTitle).toBeNull()
    expect(result.data.allowRegistration).toBeNull()
  })
})

describe('API: config/list.get', () => {
  it('非管理员抛 403', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/config/list.get')).default
    await expect(handler(makeEvent())).rejects.toThrow()
  })

  it('管理员返回所有 site:* 配置', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    _mockDb.select = vi.fn().mockReturnThis()
    _mockDb.from = vi.fn().mockReturnThis()
    _mockDb.where = vi.fn().mockResolvedValue([
      { key: 'site:title', value: 'X' },
      { key: 'site:logo', value: 'logo.png' },
    ])
    const handler = (await import('../../server/api/config/list.get')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(2)
  })
})

describe('API: config/update.post', () => {
  beforeEach(() => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
  })

  it('无效 key 返回失败', async () => {
    const handler = (await import('../../server/api/config/update.post')).default
    const result = await handler(makeEvent({ key: 'invalid:foo', value: 'x' }))
    expect(result.success).toBe(false)
  })

  it('缺失 key 返回失败', async () => {
    const handler = (await import('../../server/api/config/update.post')).default
    const result = await handler(makeEvent({ value: 'x' }))
    expect(result.success).toBe(false)
  })

  it('成功更新并广播', async () => {
    const handler = (await import('../../server/api/config/update.post')).default
    const result = await handler(makeEvent({ key: 'site:title', value: 'New' }))
    expect(result.success).toBe(true)
    expect(_mockBroadcasts).toHaveLength(1)
    expect(_mockBroadcasts[0]).toEqual({ type: 'site-config-changed' })
  })
})

describe('API: config/reload.post', () => {
  it('管理员调用 reload 不抛错', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/config/reload.post')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
  })
})

describe('API: config/update-batch.post', () => {
  it('非管理员抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/config/update-batch.post')).default
    await expect(handler(makeEvent({ items: [] }))).rejects.toThrow()
  })

  it('items 为空返回失败', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/config/update-batch.post')).default
    const result = await handler(makeEvent({ items: [] }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/items/)
  })

  it('无 items 字段返回失败', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/config/update-batch.post')).default
    const result = await handler(makeEvent({}))
    expect(result.success).toBe(false)
  })

  it('批量保存 site:* 键并广播', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/config/update-batch.post')).default
    const result = await handler(makeEvent({
      items: [
        { key: 'site:title', value: 'New Title' },
        { key: 'site:description', value: 'New Desc' },
      ],
    }))
    expect(result.success).toBe(true)
    expect(result.msg).toMatch(/保存成功/)
    expect(_mockBroadcasts).toHaveLength(1)
    expect(_mockBroadcasts[0]).toEqual({ type: 'site-config-changed' })
  })

  it('非 site: 前缀的键被跳过', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/config/update-batch.post')).default
    const result = await handler(makeEvent({
      items: [
        { key: 'other:key', value: 'skip' },
        { key: 'site:title', value: 'Keep' },
      ],
    }))
    expect(result.success).toBe(true)
  })
})
