/**
 * 通用 CRUD 数据库工具测试
 * @see modules/base/server/utils/db.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock @nuxthub/db
const _chain: any = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  inArray: vi.fn(),
  limit: vi.fn(),
  returning: vi.fn(),
  onConflictDoNothing: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
}
_chain.select.mockReturnThis()
_chain.from.mockReturnThis()
_chain.where.mockReturnThis()
_chain.insert.mockReturnThis()
_chain.values.mockReturnThis()
_chain.update.mockReturnThis()
_chain.set.mockReturnThis()
_chain.delete.mockReturnThis()
_chain.innerJoin.mockReturnThis()

const _mockDb = _chain
const _mockSchema = {
  roles: { id: 'id', code: 'code', deletedAt: 'deletedAt' },
  userRoles: { userId: 'userId', roleId: 'roleId' },
  users: { id: 'id', username: 'username', name: 'name', deletedAt: 'deletedAt' },
  permissions: { id: 'id', code: 'code' },
  rolePermissions: { roleId: 'roleId', permissionId: 'permissionId' },
  configs: { id: 'id', value: 'value' },
  // 通用 schema 占位（CRUD 工具用 schema[tableName]）
  categories: { id: 'id', name: 'name' },
  courses: { id: 'id', title: 'title' },
}

vi.mock('@nuxthub/db', () => ({
  db: _mockDb,
  schema: _mockSchema,
}))

import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
  // 重置链式 mock（clearAllMocks 后所有 .mockReturnThis 重置返回 undefined）
  _mockDb.select.mockReturnThis()
  _mockDb.from.mockReturnThis()
  _mockDb.where.mockReturnThis()
  _mockDb.insert.mockReturnThis()
  _mockDb.values.mockReturnThis()
  _mockDb.update.mockReturnThis()
  _mockDb.set.mockReturnThis()
  _mockDb.delete.mockReturnThis()
  _mockDb.innerJoin.mockReturnThis()
  _mockDb.onConflictDoNothing.mockReturnThis()
  _mockDb.onConflictDoUpdate.mockReturnThis()
})

describe('server/utils/db - validateTable', () => {
  it('有效表名原样返回', async () => {
    const { validateTable } = await import('../../server/utils/db/_helpers')
    expect(validateTable('users')).toBe('users')
  })

  it('空表名抛 400', async () => {
    const { validateTable } = await import('../../server/utils/db/_helpers')
    expect(() => validateTable('')).toThrow()
    expect(() => validateTable(undefined)).toThrow()
  })

  it('schema 中不存在的表抛 400', async () => {
    const { validateTable } = await import('../../server/utils/db/_helpers')
    expect(() => validateTable('not-a-table')).toThrow()
  })
})

describe('server/utils/db - listTable', () => {
  it('调用 db.select().from()', async () => {
    const { listTable } = await import('../../server/utils/db/crud')
    _mockDb.from.mockResolvedValueOnce([{ id: 1 }])
    await listTable('categories')
    expect(_mockDb.select).toHaveBeenCalled()
    expect(_mockDb.from).toHaveBeenCalled()
  })
})

describe('server/utils/db - showTable', () => {
  it('按 id 查询并返回第一条', async () => {
    const { showTable } = await import('../../server/utils/db/crud')
    _mockDb.limit.mockResolvedValueOnce([{ id: 1, name: 'A' }])
    const result = await showTable('categories', 1)
    expect(result).toEqual({ id: 1, name: 'A' })
  })

  it('无结果返回 null', async () => {
    const { showTable } = await import('../../server/utils/db/crud')
    _mockDb.limit.mockResolvedValueOnce([])
    const result = await showTable('categories', 999)
    expect(result).toBeNull()
  })
})

describe('server/utils/db - addTable', () => {
  it('insert 并返回结果', async () => {
    const { addTable } = await import('../../server/utils/db/crud')
    _mockDb.returning.mockResolvedValueOnce([{ id: 1, name: 'X' }])
    const result = await addTable('categories', { name: 'X' })
    expect(result).toEqual([{ id: 1, name: 'X' }])
  })
})

describe('server/utils/db - updateTable', () => {
  it('按 id 更新', async () => {
    const { updateTable } = await import('../../server/utils/db/crud')
    _mockDb.set.mockReturnThis()
    _mockDb.where.mockReturnThis()
    // 终结：where 返回 promise
    ;(_mockDb.where as any).mockResolvedValueOnce({ changes: 1 })
    const result = await updateTable('categories', 1, { name: 'Y' })
    expect(result).toEqual({ changes: 1 })
  })
})

describe('server/utils/db - batchTable', () => {
  it('delete 软删除（设置 deletedAt）', async () => {
    const { batchTable } = await import('../../server/utils/db/crud')
    _mockDb.update.mockReturnThis()
    _mockDb.set.mockReturnThis()
    ;(_mockDb.where as any).mockResolvedValueOnce({ changes: 3 })
    const result = await batchTable('categories', [1, 2, 3], 'delete')
    expect(result).toEqual({ changes: 3 })
  })

  it('remove 硬删除', async () => {
    const { batchTable } = await import('../../server/utils/db/crud')
    _mockDb.delete.mockReturnThis()
    ;(_mockDb.where as any).mockResolvedValueOnce({ changes: 2 })
    const result = await batchTable('categories', [1, 2], 'remove')
    expect(result).toEqual({ changes: 2 })
  })

  it('restore 恢复（清空 deletedAt）', async () => {
    const { batchTable } = await import('../../server/utils/db/crud')
    _mockDb.update.mockReturnThis()
    _mockDb.set.mockReturnThis()
    ;(_mockDb.where as any).mockResolvedValueOnce({ changes: 1 })
    const result = await batchTable('categories', [1], 'restore')
    expect(result).toEqual({ changes: 1 })
  })

  it('ids 为空抛 400', async () => {
    const { batchTable } = await import('../../server/utils/db/crud')
    await expect(batchTable('categories', [], 'delete')).rejects.toThrow()
  })

  it('无效 action 抛 400', async () => {
    const { batchTable } = await import('../../server/utils/db/crud')
    await expect(batchTable('categories', [1], 'invalid' as any)).rejects.toThrow()
  })
})

describe('server/utils/db - assignRoleToUser', () => {
  it('role 不存在返回 false', async () => {
    const { assignRoleToUser } = await import('../../server/utils/db/users')
    _mockDb.limit.mockResolvedValueOnce([]) // 找不到 role
    const result = await assignRoleToUser(1, 'unknown-role')
    expect(result).toBe(false)
  })

  it('role 存在时插入并返回 true', async () => {
    const { assignRoleToUser } = await import('../../server/utils/db/users')
    _mockDb.limit.mockResolvedValueOnce([{ id: 5 }]) // role 存在
    _mockDb.insert.mockReturnThis()
    _mockDb.values.mockReturnThis()
    _mockDb.onConflictDoNothing.mockResolvedValueOnce(undefined)
    const result = await assignRoleToUser(1, 'admin')
    expect(result).toBe(true)
    expect(_mockDb.insert).toHaveBeenCalled()
  })
})

describe('server/utils/db - searchUsers', () => {
  it('按关键字搜索用户', async () => {
    const { searchUsers } = await import('../../server/utils/db/users')
    _mockDb.limit.mockResolvedValueOnce([{ id: 1, username: 'alice', name: 'Alice' }])
    const result = await searchUsers('ali')
    expect(result).toHaveLength(1)
    expect(result[0].username).toBe('alice')
  })

  it('默认 limit=100', async () => {
    const { searchUsers } = await import('../../server/utils/db/users')
    _mockDb.limit.mockResolvedValueOnce([])
    await searchUsers('xxx')
    expect(_mockDb.limit).toHaveBeenCalledWith(100)
  })
})

describe('server/utils/db - upsertConfig', () => {
  it('插入或更新配置项', async () => {
    const { upsertConfig } = await import('../../server/utils/db/config')
    _mockDb.insert.mockReturnThis()
    _mockDb.values.mockReturnThis()
    _mockDb.onConflictDoUpdate.mockReturnThis()
    _mockDb.onConflictDoUpdate.mockResolvedValueOnce(undefined)
    await upsertConfig('site:title', 'New Title')
    expect(_mockDb.insert).toHaveBeenCalled()
    expect(_mockDb.onConflictDoUpdate).toHaveBeenCalled()
  })
})
