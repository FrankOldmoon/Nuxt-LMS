/**
 * LMS Bags API 端点测试
 * @see modules/lms/server/api/bags/my.get.ts
 * @see modules/lms/server/api/bags/coin.get.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  createMockDb, resetDb, makeEvent,
} from '../../../../test/setup/db-helpers'

const _mockDb = createMockDb() as any
const _mockSchema: any = {
  goods: { id: 'id', name: 'name', content: 'content', courseId: 'courseId', price: 'price', sellPrice: 'sellPrice', stock: 'stock', type: 'type' },
  bags: { userId: 'userId', goodId: 'goodId', courseId: 'courseId', quantity: 'quantity' },
  userCourses: { userId: 'userId', courseId: 'courseId', coin: 'coin' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  resetDb(_mockDb)
  vi.clearAllMocks()
})

// ====================== bags/my.get.ts ======================

describe('API: bags/my.get', () => {
  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/bags/my.get')).default
    await expect(handler(makeEvent({ query: { courseId: 1 } }))).rejects.toThrow()
  })

  it('返回用户背包（JOIN goods）', async () => {
    setMockAuthState({ id: 1, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    const sample = [
      { goodId: 1, quantity: 2, courseId: 0, name: 'Homework Pass', content: {}, price: 50, sellPrice: 25, stock: -1, type: 'item' },
      { goodId: 2, quantity: 1, courseId: 1, name: 'Course Card', content: {}, price: 30, sellPrice: 15, stock: 10, type: 'item' },
    ]
    // select().from().innerJoin().where() → where 是终端方法
    _mockDb.where = vi.fn().mockResolvedValue(sample)
    const handler = (await import('../../server/api/bags/my.get')).default
    const result = await handler(makeEvent({ query: { courseId: 1 } }))
    expect(result.success).toBe(true)
    expect(result.data).toEqual(sample)
    expect(result.data).toHaveLength(2)
  })

  it('空背包返回空数组', async () => {
    setMockAuthState({ id: 1, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    _mockDb.where = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/bags/my.get')).default
    const result = await handler(makeEvent({ query: { courseId: 1 } }))
    expect(result.success).toBe(true)
    expect(result.data).toEqual([])
  })

  it('courseId=0 时仅返回全局商品', async () => {
    setMockAuthState({ id: 1, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    const sample = [{ goodId: 1, quantity: 1, courseId: 0, name: 'Homework Pass' }]
    _mockDb.where = vi.fn().mockResolvedValue(sample)
    const handler = (await import('../../server/api/bags/my.get')).default
    const result = await handler(makeEvent({ query: { courseId: 0 } }))
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
  })
})

// ====================== bags/coin.get.ts ======================

describe('API: bags/coin.get', () => {
  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/bags/coin.get')).default
    await expect(handler(makeEvent({ query: { courseId: 1 } }))).rejects.toThrow()
  })

  it('缺少 courseId 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/bags/coin.get')).default
    const result = await handler(makeEvent({ query: {} }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/courseId/)
  })

  it('返回用户 coin 余额', async () => {
    setMockAuthState({ id: 1, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValue([{ coin: 150 }])
    const handler = (await import('../../server/api/bags/coin.get')).default
    const result = await handler(makeEvent({ query: { courseId: 1 } }))
    expect(result.success).toBe(true)
    expect(result.data.coin).toBe(150)
  })

  it('未加入课程返回 coin=0', async () => {
    setMockAuthState({ id: 1, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValue([])
    const handler = (await import('../../server/api/bags/coin.get')).default
    const result = await handler(makeEvent({ query: { courseId: 999 } }))
    expect(result.success).toBe(true)
    expect(result.data.coin).toBe(0)
  })
})
