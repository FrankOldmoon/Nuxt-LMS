/**
 * LMS Config API 端点测试
 * @see modules/lms/server/api/config/*.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const _mockDb = {
  query: {
    configs: { findFirst: vi.fn() },
  },
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
}
const _mockSchema = {
  configs: { id: 'id', value: 'value' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

// Mock lmsConfig utils to use in-memory store (delegates to global stub)
// 拍平存储所需：buildLmsConfigPairs 把树形对象转为 lms:* 拍平键值对列表
vi.mock('../../server/utils/lmsConfig', () => ({
  getLmsConfigSync: () => (globalThis as any).getLmsConfigSync(),
  reloadLmsConfig: () => (globalThis as any).reloadLmsConfig(),
  getCourseLmsConfig: (id: number) => (globalThis as any).getCourseLmsConfig(id),
  buildLmsConfigPairs: (obj: any) => (globalThis as any).buildLmsConfigPairs(obj),
  flattenTree: (prefix: string, obj: any, result: Record<string, any>) =>
    (globalThis as any).flattenTree(prefix, obj, result),
  unflattenTree: (flat: Record<string, any>) => (globalThis as any).unflattenTree(flat),
  mergeConfig: (defaults: any, overrides: any) => (globalThis as any).mergeConfig(defaults, overrides),
}))

import { resetAllStubs, setMockAuthState, setMockLmsConfig } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
  setMockLmsConfig({
    ai: { mode: 'api', model: 'gpt-3.5' },
    experience: { correctExp: 10 },
  })
  _mockDb.query.configs.findFirst = vi.fn()
  _mockDb.select = vi.fn().mockReturnThis()
  _mockDb.from = vi.fn().mockReturnThis()
  _mockDb.where = vi.fn().mockReturnThis()
  _mockDb.limit = vi.fn().mockReturnThis()
})

function makeEvent(opts: { query?: Record<string, any>; body?: any } = {}) {
  return { cookies: {}, query: opts.query || {}, body: opts.body } as any
}

describe('API: config/ai.get', () => {
  it('公开端点：返回 ai 分组（剥离敏感字段）', async () => {
    setMockLmsConfig({
      ai: {
        mode: 'api', model: 'gpt-3.5', ttsGender: 'female',
        llmApiKey: 'SECRET', llmApiUrl: 'http://secret',
      },
    })
    const handler = (await import('../../server/api/config/ai.get')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data.mode).toBe('api')
    expect(result.data.llmApiKey).toBeUndefined()
    expect(result.data.llmApiUrl).toBeUndefined()
  })
})

describe('API: config/get', () => {
  it('未登录返回 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/config/get')).default
    await expect(handler(makeEvent())).rejects.toThrow()
  })

  it('非教师抛 403', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/config/get')).default
    await expect(handler(makeEvent())).rejects.toThrow()
  })

  it('教师：返回全局配置', async () => {
    setMockAuthState({ id: 1, username: 'teacher', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/config/get')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data.ai).toBeDefined()
  })

  it('教师：传 course_id 返回合并后的配置', async () => {
    setMockAuthState({ id: 1, username: 'teacher', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/config/get')).default
    const result = await handler(makeEvent({ query: { course_id: 5 } }))
    expect(result.success).toBe(true)
    expect(result.data.courseId).toBe(5)
  })

  it('管理员：返回全局配置', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/config/get')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
  })
})

describe('API: config/update.post', () => {
  it('未登录返回 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/config/update.post')).default
    await expect(handler(makeEvent({ body: { experience: { correctExp: 20 } } }))).rejects.toThrow()
  })

  it('非教师抛 403', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/config/update.post')).default
    await expect(handler(makeEvent({ body: { experience: { correctExp: 20 } } }))).rejects.toThrow()
  })

  it('无效 body 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/config/update.post')).default
    const result = await handler(makeEvent({ body: null }))
    expect(result.success).toBe(false)
  })

  it('教师：合并并保存新配置', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.configs.findFirst).mockResolvedValue({
      id: 'lms_config',
      value: { ai: { mode: 'api' }, experience: { correctExp: 10 } },
    } as any)
    const handler = (await import('../../server/api/config/update.post')).default
    const result = await handler(makeEvent({ body: { experience: { correctExp: 20 } } }))
    expect(result.success).toBe(true)
  })

  it('教师：首次创建配置', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.configs.findFirst).mockResolvedValue(null as any)
    const handler = (await import('../../server/api/config/update.post')).default
    const result = await handler(makeEvent({ body: { ai: { mode: 'local' } } }))
    expect(result.success).toBe(true)
  })

  it('教师：拍平存储 body 为 lms:section.field 行（验证 buildLmsConfigPairs 调用）', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    // 模拟 lms:* 拍平行已存在（跳过自动迁移）
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'lms:ai.mode' }]),
    } as any)
    // 跟踪 db.insert 调用，验证每行 key 是 lms:section.field 格式
    const insertCalls: any[] = []
    vi.mocked(db.insert).mockImplementation(((..._args: any[]) => ({
      values: (v: any) => {
        insertCalls.push(v)
        return {
          onConflictDoUpdate: (_opts: any) => Promise.resolve(),
        }
      },
    })) as any)
    const { buildLmsConfigPairs } = await import('../../server/utils/lmsConfig')
    const handler = (await import('../../server/api/config/update.post')).default
    const result = await handler(makeEvent({
      body: { ai: { mode: 'ollama', model: 'llama3.2' }, user: { allowChangePassword: false } },
    }))
    expect(result.success).toBe(true)
    // 拍平后应该有 3 行：lms:ai.mode, lms:ai.model, lms:user.allowChangePassword
    expect(insertCalls.length).toBeGreaterThanOrEqual(3)
    const ids = insertCalls.map(c => c.id).sort()
    expect(ids).toContain('lms:ai.mode')
    expect(ids).toContain('lms:ai.model')
    expect(ids).toContain('lms:user.allowChangePassword')
    // 验证值正确
    const modeRow = insertCalls.find(c => c.id === 'lms:ai.mode')
    expect(modeRow.value).toBe('ollama')
    // 验证 buildLmsConfigPairs 自身行为
    const pairs = buildLmsConfigPairs({ ai: { mode: 'api' }, x: 1 })
    expect(pairs.find(p => p.key === 'lms:ai.mode')?.value).toBe('api')
    expect(pairs.find(p => p.key === 'lms:x')?.value).toBe(1)
  })

  it('教师：保存后调用 reloadLmsConfig 刷新缓存 + WS 广播 lms-config-changed', async () => {
    setMockAuthState({ id: 1, username: 'admin', roles: ['admin'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'lms:ai.mode' }]),
    } as any)
    const { getWsBroadcasts, clearWsBroadcasts } = await import('../../../../test/setup/nuxt-stubs')
    clearWsBroadcasts()
    vi.mocked(db.insert).mockImplementation(((() => ({
      values: () => ({ onConflictDoUpdate: () => Promise.resolve() }),
    })) as any))
    const handler = (await import('../../server/api/config/update.post')).default
    await handler(makeEvent({ body: { ai: { mode: 'local' } } }))
    const broadcasts = getWsBroadcasts()
    const hasConfigChanged = broadcasts.some((b: any) => b?.type === 'lms-config-changed')
    expect(hasConfigChanged).toBe(true)
  })
})
