/**
 * Admin Menu API + utils 测试
 * @see modules/admin/server/api/admin/menu.get.ts, menu.put.ts
 * @see modules/admin/server/utils/menu.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ====================== Mock @nuxthub/db ======================
const _mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflictDoNothing: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
  returning: vi.fn(),
}
const _mockSchema = {
  configs: { id: 'id', value: 'value' },
}
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
})

function makeEvent(opts: { cookies?: Record<string, any>; body?: any; params?: Record<string, any> } = {}) {
  return { cookies: opts.cookies || {}, body: opts.body, params: opts.params || {} } as any
}

describe('utils/menu - humanizeTableName', () => {
  it('camelCase → Title Case', async () => {
    const { humanizeTableName } = await import('../../server/utils/menu')
    expect(humanizeTableName('userRoles')).toBe('User Roles')
    expect(humanizeTableName('courses')).toBe('Courses')
    expect(humanizeTableName('userClasses')).toBe('User Classes')
  })
})

describe('utils/menu - defaultMenu', () => {
  it('根据 schema 生成全部可见的默认菜单', async () => {
    setMockSchemaTables(['users', 'courses', 'chapters'])
    const { defaultMenu } = await import('../../server/utils/menu')
    const menu = defaultMenu()
    expect(menu).toHaveLength(3)
    expect(menu[0]).toMatchObject({ table: 'chapters', label: 'Chapters', visible: true, order: 0 })
    expect(menu.every((m: any) => m.visible === true)).toBe(true)
  })
})

describe('utils/menu - getMenuConfig', () => {
  it('configs 表无记录时返回默认菜单', async () => {
    setMockSchemaTables(['users', 'courses'])
    _mockDb.limit = vi.fn().mockResolvedValue([]) as any
    const { getMenuConfig } = await import('../../server/utils/menu')
    const result = await getMenuConfig()
    expect(result.items).toHaveLength(2)
    expect(result.items.map((i: any) => i.table).sort()).toEqual(['courses', 'users'])
  })

  it('configs 表有记录时同步 schema（移除已删除表，补充新表）', async () => {
    setMockSchemaTables(['users', 'courses', 'chapters'])
    // 存储的菜单包含已不存在的表 'oldTable'，缺少 'chapters'
    const stored = { items: [{ table: 'users', label: 'Users', visible: true, order: 0 }, { table: 'oldTable', label: 'Old', visible: true, order: 1 }] }
    _mockDb.limit = vi.fn().mockResolvedValue([{ value: stored }]) as any
    const { getMenuConfig } = await import('../../server/utils/menu')
    const result = await getMenuConfig()
    const tables = result.items.map((i: any) => i.table)
    expect(tables).toContain('users')
    expect(tables).toContain('courses')
    expect(tables).toContain('chapters') // 新表被补充
    expect(tables).not.toContain('oldTable') // 已删除表被移除
  })

  it('分组节点保留 children 并递归同步', async () => {
    setMockSchemaTables(['users', 'courses'])
    const stored = {
      items: [{
        label: '分组',
        visible: true,
        order: 0,
        children: [
          { table: 'users', label: '用户', visible: true, order: 0 },
          { table: 'gone', label: '已删', visible: true, order: 1 },
        ],
      }],
    }
    _mockDb.limit = vi.fn().mockResolvedValue([{ value: stored }]) as any
    const { getMenuConfig } = await import('../../server/utils/menu')
    const result = await getMenuConfig()
    const group = result.items.find((i: any) => i.children)
    expect(group).toBeTruthy()
    expect(group!.children!.map((c: any) => c.table)).toEqual(['users'])
  })
})

describe('API: admin/menu.get', () => {
  it('未登录抛 401', async () => {
    setMockAuthState(null)
    setMockSchemaTables(['users'])
    _mockDb.limit = vi.fn().mockResolvedValue([]) as any
    // 暴露 getMenuConfig 到 globalThis 供端点 auto-import
    const menuUtil = await import('../../server/utils/menu')
    ;(globalThis as any).getMenuConfig = menuUtil.getMenuConfig
    const handler = (await import('../../server/api/admin/menu.get')).default
    await expect(handler(makeEvent())).rejects.toThrow()
  })

  it('管理员返回菜单配置', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    setMockSchemaTables(['users'])
    _mockDb.limit = vi.fn().mockResolvedValue([]) as any
    const menuUtil = await import('../../server/utils/menu')
    ;(globalThis as any).getMenuConfig = menuUtil.getMenuConfig
    const handler = (await import('../../server/api/admin/menu.get')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data.items).toHaveLength(1)
  })
})

describe('API: admin/menu.put', () => {
  it('规范化：丢弃无效项，保留有效叶子与分组', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    setMockSchemaTables(['users', 'courses'])
    const menuUtil = await import('../../server/utils/menu')
    ;(globalThis as any).humanizeTableName = menuUtil.humanizeTableName
    ;(globalThis as any).setMenuConfig = menuUtil.setMenuConfig
    const handler = (await import('../../server/api/admin/menu.put')).default
    const body = {
      items: [
        { table: 'users', label: '用户', visible: true },
        { table: 'nonExistent', label: '不存在' }, // 丢弃
        { label: '分组', children: [{ table: 'courses' }] },
        null, // 丢弃
      ],
    }
    const result = await handler(makeEvent({ body }))
    expect(result.success).toBe(true)
    const tables = result.data.items.flatMap((i: any) => (i.children ? i.children.map((c: any) => c.table) : [i.table]))
    expect(tables).toContain('users')
    expect(tables).toContain('courses')
    expect(tables).not.toContain('nonExistent')
  })

  it('空 items 返回空数组', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    setMockSchemaTables(['users'])
    const menuUtil = await import('../../server/utils/menu')
    ;(globalThis as any).humanizeTableName = menuUtil.humanizeTableName
    ;(globalThis as any).setMenuConfig = menuUtil.setMenuConfig
    const handler = (await import('../../server/api/admin/menu.put')).default
    const result = await handler(makeEvent({ body: { items: [] } }))
    expect(result.success).toBe(true)
    expect(result.data.items).toEqual([])
  })
})
