/**
 * LMS Goods CRUD API 端点测试
 * @see modules/lms/server/api/goods/*.ts
 *
 * 覆盖：
 * - list.get.ts     商店商品列表（学生浏览）
 * - manage.get.ts   可管理商品列表（admin/教师）
 * - add.post.ts     新增商品
 * - update.post.ts  更新商品
 * - delete.post.ts  删除商品
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  createMockDb, resetDb, makeEvent,
} from '../../../../test/setup/db-helpers'

const _mockDb = createMockDb() as any
const _mockSchema: any = {
  goods: { id: 'id', name: 'name', content: 'content', courseId: 'courseId', price: 'price', sellPrice: 'sellPrice', stock: 'stock', type: 'type', order: 'order' },
  bags: { userId: 'userId', goodId: 'goodId', courseId: 'courseId', quantity: 'quantity' },
  userCourses: { userId: 'userId', courseId: 'courseId', isTeacher: 'isTeacher', isEditor: 'isEditor', coin: 'coin' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  resetDb(_mockDb)
  vi.clearAllMocks()
})

// ====================== list.get.ts ======================

describe('API: goods/list.get', () => {
  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/goods/list.get')).default
    await expect(handler(makeEvent({ query: { courseId: 1 } }))).rejects.toThrow()
  })

  it('返回全局+课程商品', async () => {
    setMockAuthState({ id: 1, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    const sample = [
      { id: 1, name: 'Homework Pass', courseId: 0, price: 50 },
      { id: 2, name: 'Course Card', courseId: 1, price: 30 },
    ]
    _mockDb.orderBy = vi.fn().mockResolvedValue(sample)
    const handler = (await import('../../server/api/goods/list.get')).default
    const result = await handler(makeEvent({ query: { courseId: 1 } }))
    expect(result.success).toBe(true)
    expect(result.data).toEqual(sample)
  })

  it('无商品返回空数组', async () => {
    setMockAuthState({ id: 1, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    _mockDb.orderBy = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/goods/list.get')).default
    const result = await handler(makeEvent({ query: { courseId: 1 } }))
    expect(result.success).toBe(true)
    expect(result.data).toEqual([])
  })
})

// ====================== manage.get.ts ======================

describe('API: goods/manage.get.ts', () => {
  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/goods/manage.get')).default
    await expect(handler(makeEvent({ query: { courseId: 1 } }))).rejects.toThrow()
  })

  it('学生无权限', async () => {
    setMockAuthState({ id: 1, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/goods/manage.get')).default
    const result = await handler(makeEvent({ query: { courseId: 1 } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/无权限/)
  })

  it('非管理员请求全部商品返回失败', async () => {
    setMockAuthState({ id: 1, username: 't', name: 'T', roles: ['teacher'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValue([{ isTeacher: true, isEditor: false }])
    const handler = (await import('../../server/api/goods/manage.get')).default
    const result = await handler(makeEvent({ query: {} }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/无权限/)
  })

  it('管理员查看全部商品', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const sample = [{ id: 1, name: 'G1' }, { id: 2, name: 'G2' }]
    _mockDb.orderBy = vi.fn().mockResolvedValue(sample)
    const handler = (await import('../../server/api/goods/manage.get')).default
    const result = await handler(makeEvent({ query: {} }))
    expect(result.success).toBe(true)
    expect(result.data).toEqual(sample)
  })

  it('教师查看自己课程商品', async () => {
    setMockAuthState({ id: 1, username: 't', name: 'T', roles: ['teacher'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValue([{ isTeacher: true, isEditor: false }])
    const sample = [{ id: 1, name: 'G1', courseId: 1 }]
    _mockDb.orderBy = vi.fn().mockResolvedValue(sample)
    const handler = (await import('../../server/api/goods/manage.get')).default
    const result = await handler(makeEvent({ query: { courseId: 1 } }))
    expect(result.success).toBe(true)
    expect(result.data).toEqual(sample)
  })
})

// ====================== add.post.ts ======================

describe('API: goods/add.post', () => {
  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/goods/add.post')).default
    await expect(handler(makeEvent({ body: { name: 'G1' } }))).rejects.toThrow()
  })

  it('缺少 name 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/goods/add.post')).default
    const result = await handler(makeEvent({ body: {} }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/name/)
  })

  it('学生创建商品无权限', async () => {
    setMockAuthState({ id: 1, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/goods/add.post')).default
    const result = await handler(makeEvent({ body: { name: 'G1', courseId: 1 } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/无权限/)
  })

  it('学生不能创建全局商品', async () => {
    setMockAuthState({ id: 1, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/goods/add.post')).default
    const result = await handler(makeEvent({ body: { name: 'G1', courseId: 0 } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/无权限/)
  })

  it('管理员成功创建全局商品', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    _mockDb.returning = vi.fn().mockResolvedValue([{ id: 1, name: 'Homework Pass', courseId: 0, price: 50 }])
    const handler = (await import('../../server/api/goods/add.post')).default
    const result = await handler(makeEvent({ body: { name: 'Homework Pass', courseId: 0, price: 50, sellPrice: 25 } }))
    expect(result.success).toBe(true)
    expect(result.data.name).toBe('Homework Pass')
    expect(_mockDb.insert).toHaveBeenCalled()
  })

  it('教师成功创建课程商品', async () => {
    setMockAuthState({ id: 1, username: 't', name: 'T', roles: ['teacher'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValue([{ isTeacher: true, isEditor: false }])
    _mockDb.returning = vi.fn().mockResolvedValue([{ id: 2, name: 'Course Card', courseId: 1, price: 30 }])
    const handler = (await import('../../server/api/goods/add.post')).default
    const result = await handler(makeEvent({ body: { name: 'Course Card', courseId: 1, price: 30, sellPrice: 15 } }))
    expect(result.success).toBe(true)
    expect(result.data.name).toBe('Course Card')
  })
})

// ====================== update.post.ts ======================

describe('API: goods/update.post', () => {
  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/goods/update.post')).default
    await expect(handler(makeEvent({ body: { id: 1, name: 'New' } }))).rejects.toThrow()
  })

  it('缺少 id 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/goods/update.post')).default
    const result = await handler(makeEvent({ body: { name: 'New' } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/id/)
  })

  it('学生无权限更新', async () => {
    setMockAuthState({ id: 1, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValue([{ courseId: 1 }])
    _mockDb.limit = vi.fn().mockResolvedValueOnce([{ courseId: 1 }]).mockResolvedValueOnce([])
    const handler = (await import('../../server/api/goods/update.post')).default
    const result = await handler(makeEvent({ body: { id: 1, name: 'New' } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/无权限/)
  })

  it('管理员成功更新商品', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    _mockDb.returning = vi.fn().mockResolvedValue([{ id: 1, name: 'Updated', price: 60 }])
    const handler = (await import('../../server/api/goods/update.post')).default
    const result = await handler(makeEvent({ body: { id: 1, name: 'Updated', price: 60 } }))
    expect(result.success).toBe(true)
    expect(result.data.name).toBe('Updated')
    expect(_mockDb.update).toHaveBeenCalled()
  })
})

// ====================== delete.post.ts ======================

describe('API: goods/delete.post', () => {
  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/goods/delete.post')).default
    await expect(handler(makeEvent({ body: { id: 1 } }))).rejects.toThrow()
  })

  it('缺少 id 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/goods/delete.post')).default
    const result = await handler(makeEvent({ body: {} }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/id/)
  })

  it('学生无权限删除', async () => {
    setMockAuthState({ id: 1, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValueOnce([{ courseId: 1 }]).mockResolvedValueOnce([])
    const handler = (await import('../../server/api/goods/delete.post')).default
    const result = await handler(makeEvent({ body: { id: 1 } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/无权限/)
  })

  it('管理员成功删除商品', async () => {
    setMockAuthState({ id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/goods/delete.post')).default
    const result = await handler(makeEvent({ body: { id: 5 } }))
    expect(result.success).toBe(true)
    expect(_mockDb.delete).toHaveBeenCalled()
  })
})
