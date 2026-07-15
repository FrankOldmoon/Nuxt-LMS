/**
 * Admin Columns API + utils tests
 * @see modules/admin/server/api/admin/columns/[table].get.ts, [table].put.ts
 * @see modules/admin/server/utils/columns.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const _mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
}
const _mockSchema = { configs: { id: 'id', value: 'value' } }
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

import {
  resetAllStubs,
  setMockAuthState,
  setMockSchemaTables,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
  _mockDb.select = vi.fn().mockReturnThis()
  _mockDb.from = vi.fn().mockReturnThis()
  _mockDb.where = vi.fn().mockReturnThis()
  _mockDb.limit = vi.fn()
  setMockSchemaTables(['users', 'courses'])
})

function makeEvent(opts: { body?: any; params?: Record<string, any> } = {}) {
  return { cookies: {}, body: opts.body, params: opts.params || {} } as any
}

describe('utils/columns - getColumnConfig', () => {
  it('无存储记录返回默认隐藏列', async () => {
    _mockDb.limit = vi.fn().mockResolvedValue([]) as any
    const { getColumnConfig, DEFAULT_HIDDEN_COLUMNS } = await import('../../server/utils/columns')
    const cfg = await getColumnConfig('users')
    expect(cfg.hidden).toEqual(DEFAULT_HIDDEN_COLUMNS)
  })

  it('有存储记录返回存储的 hidden 列表', async () => {
    _mockDb.limit = vi.fn().mockResolvedValue([{ value: { hidden: ['password', 'email'] } }]) as any
    const { getColumnConfig } = await import('../../server/utils/columns')
    const cfg = await getColumnConfig('users')
    expect(cfg.hidden).toEqual(['password', 'email'])
  })

  it('存储 hidden 非数组时回退默认', async () => {
    _mockDb.limit = vi.fn().mockResolvedValue([{ value: { hidden: 'not-array' } }]) as any
    const { getColumnConfig, DEFAULT_HIDDEN_COLUMNS } = await import('../../server/utils/columns')
    const cfg = await getColumnConfig('users')
    expect(cfg.hidden).toEqual(DEFAULT_HIDDEN_COLUMNS)
  })
})

describe('API: admin/columns/[table].get', () => {
  it('未登录抛 401', async () => {
    setMockAuthState(null)
    _mockDb.limit = vi.fn().mockResolvedValue([]) as any
    const colsUtil = await import('../../server/utils/columns')
    ;(globalThis as any).getColumnConfig = colsUtil.getColumnConfig
    const handler = (await import('../../server/api/admin/columns/[table].get')).default
    await expect(handler(makeEvent({ params: { table: 'users' } }))).rejects.toThrow()
  })

  it('管理员返回列配置', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValue([{ value: { hidden: ['password'] } }]) as any
    const colsUtil = await import('../../server/utils/columns')
    ;(globalThis as any).getColumnConfig = colsUtil.getColumnConfig
    const handler = (await import('../../server/api/admin/columns/[table].get')).default
    const result = await handler(makeEvent({ params: { table: 'users' } }))
    expect(result.success).toBe(true)
    expect(result.data.hidden).toEqual(['password'])
  })
})

describe('API: admin/columns/[table].put', () => {
  it('保存 hidden 列（过滤非字符串）', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const colsUtil = await import('../../server/utils/columns')
    ;(globalThis as any).setColumnConfig = colsUtil.setColumnConfig
    const handler = (await import('../../server/api/admin/columns/[table].put')).default
    const result = await handler(makeEvent({
      params: { table: 'users' },
      body: { hidden: ['password', 123, null, 'email'] },
    }))
    expect(result.success).toBe(true)
    expect(result.data.hidden).toEqual(['password', 'email'])
  })

  it('hidden 非数组时返回空', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const colsUtil = await import('../../server/utils/columns')
    ;(globalThis as any).setColumnConfig = colsUtil.setColumnConfig
    const handler = (await import('../../server/api/admin/columns/[table].put')).default
    const result = await handler(makeEvent({ params: { table: 'users' }, body: { hidden: 'not-array' } }))
    expect(result.success).toBe(true)
    expect(result.data.hidden).toEqual([])
  })
})
