/**
 * Files API 端点测试
 * @see modules/base/server/api/files/*.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const _mockDb = {
  query: {
    files: { findFirst: vi.fn() },
  },
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
  delete: vi.fn().mockReturnThis(),
}
const _mockSchema = {
  files: {
    id: 'id', name: 'name', hash: 'hash', path: 'path', type: 'type',
    size: 'size', userId: 'userId', group: 'group', deletedAt: 'deletedAt',
  },
  users: { id: 'id', username: 'username' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
})

function makeEvent(body: any = undefined, query: any = {}) {
  return { cookies: {}, body, query } as any
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
  _mockDb.delete = vi.fn().mockReturnThis()
  _mockDb.query.files.findFirst = vi.fn()
}

describe('API: files/delete.post (soft delete)', () => {
  beforeEach(resetChain)

  it('未登录返回 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/files/delete.post')).default
    await expect(handler(makeEvent({ id: 1 }))).rejects.toThrow()
  })

  it('缺少 id 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/files/delete.post')).default
    const result = await handler(makeEvent({}))
    expect(result.success).toBe(false)
  })

  it('文件不存在返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue(null as any)
    const handler = (await import('../../server/api/files/delete.post')).default
    const result = await handler(makeEvent({ id: 999 }))
    expect(result.success).toBe(false)
  })

  it('个人文件：他用户不能删', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({
      id: 1, userId: 2, group: null, path: '/a/b.png',
    } as any)
    const handler = (await import('../../server/api/files/delete.post')).default
    const result = await handler(makeEvent({ id: 1 }))
    expect(result.success).toBe(false)
  })

  it('个人文件：所有者可删（软删除）', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({
      id: 1, userId: 1, group: null, path: '/a/b.png',
    } as any)
    const handler = (await import('../../server/api/files/delete.post')).default
    const result = await handler(makeEvent({ id: 1 }))
    expect(result.success).toBe(true)
    expect(result.data.id).toBe(1)
    // 软删除：调用 update.set({deletedAt: ...})，不调用 fs.rm
    expect(db.update).toHaveBeenCalled()
    expect(db.delete).not.toHaveBeenCalled()
  })

  it('小组文件：任何成员可删', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({
      id: 2, userId: 99, group: 'team-a', path: '/team/file.png',
    } as any)
    const handler = (await import('../../server/api/files/delete.post')).default
    const result = await handler(makeEvent({ id: 2 }))
    expect(result.success).toBe(true)
  })

  it('软删除：源代码不再 import node:fs/promises.rm（已不再删除物理文件）', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({
      id: 1, userId: 1, group: null, path: '/a/b.png',
    } as any)
    // 静态校验：源码不应再 import node:fs/promises（软删除不删物理文件）
    const source = await import('node:fs').then(fs =>
      fs.promises.readFile('/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/modules/base/server/api/files/delete.post.ts', 'utf8')
    )
    expect(source).not.toMatch(/from\s+['"]node:fs\/promises['"]/)
    expect(source).not.toMatch(/\brm\s*\(/) // 不应有 rm() 调用
    const handler = (await import('../../server/api/files/delete.post')).default
    const result = await handler(makeEvent({ id: 1 }))
    expect(result.success).toBe(true)
  })
})

describe('API: files/upload.post — 软删除后重新上传', () => {
  it('查重 WHERE 子句包含 isNull(deletedAt)（源代码静态校验）', async () => {
    const text = await (await import('node:fs')).promises.readFile(
      '/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/modules/base/server/api/files/upload.post.ts',
      'utf8'
    )
    // dedup 查重（主流程 + catch 分支）必须过滤 deletedAt
    const matches = text.match(/isNull\(schema\.files\.deletedAt\)/g) || []
    expect(matches.length).toBeGreaterThanOrEqual(2)
  })

  it('dedupWhere 变量同时覆盖主查重与 catch 冲突查重', async () => {
    const text = await (await import('node:fs')).promises.readFile(
      '/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/modules/base/server/api/files/upload.post.ts',
      'utf8'
    )
    // 第一处：主流程查重 findFirst
    expect(text).toMatch(/const existing = await db\.query\.files\.findFirst\(\{ where: dedupWhere \}\)/)
    // 第二处：catch 分支冲突查重 findFirst
    expect(text).toMatch(/const conflict = await db\.query\.files\.findFirst\(\{ where: dedupWhere \}\)/)
  })
})
