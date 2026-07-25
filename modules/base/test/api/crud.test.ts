/**
 * base 模块 CRUD API 端点测试
 * @see modules/base/server/api/crud/[table]/*.ts
 *
 * 测试 7 个端点：list.get / show.get / add.post / update.post / batch.post / import.post / export.get
 * 含 Bug 4 回归：复合主键表调用 show/update/batch 时底层抛 400
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetAllStubs, setMockAuthState, setMockSchemaTables } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockSchemaTables(['users', 'courses', 'categories', 'userRoles'])
})

function makeEvent(opts: { params?: Record<string, any>; query?: Record<string, any>; body?: any } = {}) {
  return {
    params: opts.params || {},
    query: opts.query || {},
    body: opts.body,
    cookies: {},
  } as any
}

describe('API: crud/[table]/list.get', () => {
  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/crud/[table]/list.get')).default
    await expect(handler(makeEvent({ params: { table: 'users' } }))).rejects.toThrow()
  })

  it('有效请求返回分页数据', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    globalThis.listTablePaged = vi.fn().mockResolvedValue({
      data: [{ id: 1, name: 'A' }], total: 1, page: 1, pageSize: 20, columns: [], meta: {},
    })
    const handler = (await import('../../server/api/crud/[table]/list.get')).default
    const result = await handler(makeEvent({
      params: { table: 'users' },
      query: { page: '1', pageSize: '20', sort: 'createdAt:desc', search: 'ali', includeDeleted: 'false' },
    }))
    expect(result.success).toBe(true)
    expect(result.data.data).toHaveLength(1)
    expect(globalThis.listTablePaged).toHaveBeenCalledWith('users', expect.objectContaining({
      page: 1, pageSize: 20, sort: { column: 'createdAt', dir: 'desc' }, search: 'ali',
    }))
  })

  it('无效表名抛 400', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/crud/[table]/list.get')).default
    await expect(handler(makeEvent({ params: { table: 'not-a-table' } }))).rejects.toThrow()
  })

  it('filters JSON 字符串正确解析', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    globalThis.listTablePaged = vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20, columns: [], meta: {} })
    const handler = (await import('../../server/api/crud/[table]/list.get')).default
    await handler(makeEvent({
      params: { table: 'users' },
      query: { filters: JSON.stringify([{ column: 'name', op: 'contains', value: 'A' }]) },
    }))
    expect(globalThis.listTablePaged).toHaveBeenCalledWith('users', expect.objectContaining({
      filters: [{ column: 'name', op: 'contains', value: 'A' }],
    }))
  })
})

describe('API: crud/[table]/show.get', () => {
  it('缺少 id 参数返回失败', async () => {
    const handler = (await import('../../server/api/crud/[table]/show.get')).default
    const result = await handler(makeEvent({ params: { table: 'users' }, query: {} }))
    expect(result.success).toBe(false)
  })

  it('有效 id 返回单条记录', async () => {
    globalThis.showTable = vi.fn().mockResolvedValue({ id: 1, name: 'Alice' })
    const handler = (await import('../../server/api/crud/[table]/show.get')).default
    const result = await handler(makeEvent({ params: { table: 'users' }, query: { id: '1' } }))
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ id: 1, name: 'Alice' })
  })

  it('回归 Bug 4：复合主键表 showTable 抛 400', async () => {
    globalThis.showTable = vi.fn().mockRejectedValue(Object.assign(new Error('复合主键表'), { statusCode: 400 }))
    const handler = (await import('../../server/api/crud/[table]/show.get')).default
    await expect(handler(makeEvent({ params: { table: 'userRoles' }, query: { id: '1' } }))).rejects.toThrow()
    expect(globalThis.showTable).toHaveBeenCalledWith('userRoles', 1)
  })
})

describe('API: crud/[table]/add.post', () => {
  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/crud/[table]/add.post')).default
    await expect(handler(makeEvent({ params: { table: 'users' }, body: { name: 'X' } }))).rejects.toThrow()
  })

  it('有效请求返回新增结果', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    globalThis.addTable = vi.fn().mockResolvedValue([{ id: 10, name: 'New' }])
    const handler = (await import('../../server/api/crud/[table]/add.post')).default
    const result = await handler(makeEvent({ params: { table: 'categories' }, body: { name: 'New' } }))
    expect(result.success).toBe(true)
    expect(result.data).toEqual([{ id: 10, name: 'New' }])
  })
})

describe('API: crud/[table]/update.post', () => {
  it('缺少 id 参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/crud/[table]/update.post')).default
    const result = await handler(makeEvent({ params: { table: 'users' }, body: { name: 'Updated' } }))
    expect(result.success).toBe(false)
  })

  it('有效请求返回更新结果', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    globalThis.updateTable = vi.fn().mockResolvedValue({ changes: 1 })
    const handler = (await import('../../server/api/crud/[table]/update.post')).default
    const result = await handler(makeEvent({ params: { table: 'users' }, body: { id: 5, name: 'Updated' } }))
    expect(result.success).toBe(true)
    expect(globalThis.updateTable).toHaveBeenCalledWith('users', 5, { name: 'Updated' })
  })

  it('回归 Bug 4：复合主键表 updateTable 抛错误', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    globalThis.updateTable = vi.fn().mockRejectedValue(Object.assign(new Error('复合主键表'), { message: '表 userRoles 为复合主键表，不支持按 id 更新' }))
    const handler = (await import('../../server/api/crud/[table]/update.post')).default
    const result = await handler(makeEvent({ params: { table: 'userRoles' }, body: { id: 5, roleId: 2 } }))
    expect(result.success).toBe(false)
  })
})

describe('API: crud/[table]/batch.post', () => {
  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/crud/[table]/batch.post')).default
    await expect(handler(makeEvent({ params: { table: 'users' }, body: { ids: [1], action: 'delete' } }))).rejects.toThrow()
  })

  it('有效批量删除', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    globalThis.batchTable = vi.fn().mockResolvedValue({ changes: 3 })
    const handler = (await import('../../server/api/crud/[table]/batch.post')).default
    const result = await handler(makeEvent({ params: { table: 'users' }, body: { ids: [1, 2, 3], action: 'delete' } }))
    expect(result.success).toBe(true)
    expect(globalThis.batchTable).toHaveBeenCalledWith('users', [1, 2, 3], 'delete')
  })

  it('空 ids 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    globalThis.batchTable = vi.fn().mockRejectedValue(new Error('ids 不能为空'))
    const handler = (await import('../../server/api/crud/[table]/batch.post')).default
    const result = await handler(makeEvent({ params: { table: 'users' }, body: { ids: [], action: 'delete' } }))
    expect(result.success).toBe(false)
  })

  it('回归 Bug 4：复合主键表 batchTable 抛错误', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    globalThis.batchTable = vi.fn().mockRejectedValue(Object.assign(new Error('复合主键表'), { message: '表 userRoles 为复合主键表，不支持按 id 批量操作' }))
    const handler = (await import('../../server/api/crud/[table]/batch.post')).default
    const result = await handler(makeEvent({ params: { table: 'userRoles' }, body: { ids: [1], action: 'delete' } }))
    expect(result.success).toBe(false)
  })
})

describe('API: crud/[table]/import.post', () => {
  it('空 rows 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/crud/[table]/import.post')).default
    const result = await handler(makeEvent({ params: { table: 'users' }, body: { rows: [] } }))
    expect(result.success).toBe(false)
  })

  it('有效导入返回 inserted 数', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    globalThis.importTableRows = vi.fn().mockResolvedValue({ inserted: 3, errors: [] })
    const handler = (await import('../../server/api/crud/[table]/import.post')).default
    const result = await handler(makeEvent({
      params: { table: 'users' },
      body: { rows: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] },
    }))
    expect(result.success).toBe(true)
    expect(result.data.inserted).toBe(3)
  })

  it('部分失败返回成功+错误信息', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    globalThis.importTableRows = vi.fn().mockResolvedValue({ inserted: 2, errors: ['第 3 行: 约束冲突'] })
    const handler = (await import('../../server/api/crud/[table]/import.post')).default
    const result = await handler(makeEvent({
      params: { table: 'users' },
      body: { rows: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] },
    }))
    expect(result.success).toBe(true)
    expect(result.data.errors).toHaveLength(1)
  })
})

describe('API: crud/[table]/export.get', () => {
  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/crud/[table]/export.get')).default
    await expect(handler(makeEvent({ params: { table: 'users' } }))).rejects.toThrow()
  })

  it('有效导出返回行数组', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    globalThis.exportTableRows = vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }])
    const handler = (await import('../../server/api/crud/[table]/export.get')).default
    const result = await handler(makeEvent({ params: { table: 'users' }, query: { search: 'ali' } }))
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(2)
    expect(globalThis.exportTableRows).toHaveBeenCalledWith('users', expect.objectContaining({ search: 'ali' }))
  })

  it('includeDeleted 参数正确传递', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    globalThis.exportTableRows = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/crud/[table]/export.get')).default
    await handler(makeEvent({ params: { table: 'users' }, query: { includeDeleted: 'true' } }))
    expect(globalThis.exportTableRows).toHaveBeenCalledWith('users', expect.objectContaining({ includeDeleted: true }))
  })
})
