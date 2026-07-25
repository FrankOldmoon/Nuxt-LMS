/**
 * Admin FK Options API 测试（含复合主键回归）
 * @see modules/admin/server/api/admin/fk-options.get.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const _mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
}
const _mockSchema = {
  users: { id: 'id', name: 'name', deletedAt: 'deletedAt' },
  userRoles: { userId: 'userId', roleId: 'roleId', deletedAt: 'deletedAt' }, // 复合主键表，无 id
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

import { resetAllStubs, setMockAuthState, setMockTableMeta } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
  _mockDb.select = vi.fn().mockReturnThis()
  _mockDb.from = vi.fn().mockReturnThis()
  _mockDb.where = vi.fn().mockReturnThis()
  _mockDb.limit = vi.fn()
})

function makeEvent(query: Record<string, any> = {}) {
  return { cookies: {}, query, params: {} } as any
}

describe('API: admin/fk-options.get', () => {
  it('未登录抛 401', async () => {
    setMockAuthState(null)
    setMockTableMeta('users', { hasId: true, labelColumn: 'name', columns: [{ jsName: 'id' }, { jsName: 'name' }] })
    const handler = (await import('../../server/api/admin/fk-options.get')).default
    await expect(handler(makeEvent({ table: 'users' }))).rejects.toThrow()
  })

  it('无效表名返回失败', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/admin/fk-options.get')).default
    const result = await handler(makeEvent({ table: '' }))
    expect(result.success).toBe(false)
  })

  it('普通表返回 id+label 选项', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    setMockTableMeta('users', { hasId: true, labelColumn: 'name', columns: [{ jsName: 'id' }, { jsName: 'name' }] })
    _mockDb.limit = vi.fn().mockResolvedValue([
      { id: 1, label: 'Alice' },
      { id: 2, label: '' }, // 空 label 回退 #id
    ]) as any
    const handler = (await import('../../server/api/admin/fk-options.get')).default
    const result = await handler(makeEvent({ table: 'users' }))
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(2)
    expect(result.data[0]).toEqual({ id: 1, label: 'Alice' })
    expect(result.data[1]).toEqual({ id: 2, label: '#2' })
  })

  it('回归：复合主键外表（无 id）返回空数组而非崩溃', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    // userRoles 是复合主键表，无 id 列
    setMockTableMeta('userRoles', { hasId: false, compositePk: true, labelColumn: undefined, columns: [{ jsName: 'userId' }, { jsName: 'roleId' }] })
    const handler = (await import('../../server/api/admin/fk-options.get')).default
    const result = await handler(makeEvent({ table: 'userRoles' }))
    expect(result.success).toBe(true)
    expect(result.data).toEqual([])
    // 不应触发 db.select（避免 table.id 为 undefined 崩溃）
    expect(_mockDb.select).not.toHaveBeenCalled()
  })

  it('显式 label 参数优先', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    setMockTableMeta('users', { hasId: true, labelColumn: 'name', columns: [{ jsName: 'id' }, { jsName: 'name' }, { jsName: 'username' }] })
    _mockDb.limit = vi.fn().mockResolvedValue([{ id: 1, label: 'alice' }]) as any
    const handler = (await import('../../server/api/admin/fk-options.get')).default
    await handler(makeEvent({ table: 'users', label: 'username' }))
    // select 应被调用（label 列为 username）
    expect(_mockDb.select).toHaveBeenCalled()
  })
})
