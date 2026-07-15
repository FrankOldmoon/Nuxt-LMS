/**
 * Admin Tables API tests
 * @see modules/admin/server/api/admin/tables.get.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@nuxthub/db', () => ({ db: {}, schema: {} }))

import { resetAllStubs, setMockAuthState, setMockSchemaTables, setMockTableMeta } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockSchemaTables(['users', 'courses'])
  setMockTableMeta('users', {
    name: 'users', hasId: true, compositePk: false, readOnly: false,
    labelColumn: 'name', columns: [{ jsName: 'id' }, { jsName: 'name' }],
  })
  setMockTableMeta('courses', {
    name: 'courses', hasId: true, compositePk: false, readOnly: false,
    labelColumn: 'name', columns: [{ jsName: 'id' }],
  })
})

function makeEvent() {
  return { cookies: {}, params: {} } as any
}

describe('API: admin/tables.get', () => {
  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/admin/tables.get')).default
    await expect(handler(makeEvent())).rejects.toThrow()
  })

  it('管理员返回所有表元数据', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/admin/tables.get')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(2)
    const names = result.data.map((m: any) => m.name).sort()
    expect(names).toEqual(['courses', 'users'])
    // Each item contains hasId / compositePk / readOnly / columns / labelColumn
    expect(result.data[0]).toHaveProperty('hasId')
    expect(result.data[0]).toHaveProperty('compositePk')
    expect(result.data[0]).toHaveProperty('readOnly')
    expect(result.data[0]).toHaveProperty('columns')
  })
})
