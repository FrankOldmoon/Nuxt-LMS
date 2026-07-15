/**
 * LMS Goods buy/sell transaction API endpoint tests
 * @see modules/lms/server/api/goods/buy.post.ts
 * @see modules/lms/server/api/goods/sell.post.ts
 *
 * Coverage:
 * - Buy: deduct coin + add bag + decrement stock
 * - Sell: add coin + deduct bag + increment stock
 * - Edge cases: goods not found, insufficient coins, insufficient stock, course mismatch, not joined course, empty bag
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
  // mock transaction: directly execute the callback, passing in the mock db
  _mockDb.transaction = vi.fn().mockImplementation(async (fn: any) => fn(_mockDb))
  vi.clearAllMocks()
})

// ====================== buy.post.ts ======================

describe('API: goods/buy.post', () => {
  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/goods/buy.post')).default
    await expect(handler(makeEvent({ body: { goodId: 1, paidCourseId: 1 } }))).rejects.toThrow()
  })

  it('缺少参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/goods/buy.post')).default
    const result = await handler(makeEvent({ body: { goodId: 1 } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/参数/)
  })

  it('商品不存在返回失败', async () => {
    setMockAuthState({ id: 1, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValueOnce([]) // goods query returns empty
    const handler = (await import('../../server/api/goods/buy.post')).default
    const result = await handler(makeEvent({ body: { goodId: 999, paidCourseId: 1 } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/不存在/)
  })

  it('课程专属商品不匹配当前课程返回失败', async () => {
    setMockAuthState({ id: 1, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValueOnce([{ id: 1, name: 'G1', courseId: 2, price: 30, sellPrice: 15, stock: -1 }])
    const handler = (await import('../../server/api/goods/buy.post')).default
    const result = await handler(makeEvent({ body: { goodId: 1, paidCourseId: 1 } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/不属于当前课程/)
  })

  it('库存不足返回失败', async () => {
    setMockAuthState({ id: 1, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValueOnce([{ id: 1, name: 'G1', courseId: 0, price: 30, sellPrice: 15, stock: 0 }])
    const handler = (await import('../../server/api/goods/buy.post')).default
    const result = await handler(makeEvent({ body: { goodId: 1, paidCourseId: 1 } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/库存/)
  })

  it('未加入课程返回失败', async () => {
    setMockAuthState({ id: 1, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn()
      .mockResolvedValueOnce([{ id: 1, name: 'G1', courseId: 0, price: 30, sellPrice: 15, stock: -1 }]) // goods
      .mockResolvedValueOnce([]) // userCourses is empty
    const handler = (await import('../../server/api/goods/buy.post')).default
    const result = await handler(makeEvent({ body: { goodId: 1, paidCourseId: 1 } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/未加入/)
  })

  it('金币不足返回失败', async () => {
    setMockAuthState({ id: 1, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn()
      .mockResolvedValueOnce([{ id: 1, name: 'G1', courseId: 0, price: 100, sellPrice: 50, stock: -1 }]) // goods
      .mockResolvedValueOnce([{ userId: 1, courseId: 1, coin: 50 }]) // userCourses coin < price
    const handler = (await import('../../server/api/goods/buy.post')).default
    const result = await handler(makeEvent({ body: { goodId: 1, paidCourseId: 1 } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/金币/)
  })

  it('成功购买全局商品', async () => {
    setMockAuthState({ id: 1, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn()
      .mockResolvedValueOnce([{ id: 1, name: 'Homework Pass', courseId: 0, price: 50, sellPrice: 25, stock: -1 }]) // goods
      .mockResolvedValueOnce([{ userId: 1, courseId: 1, coin: 100 }]) // userCourses
      .mockResolvedValueOnce([{ quantity: 1 }]) // bags query
    const handler = (await import('../../server/api/goods/buy.post')).default
    const result = await handler(makeEvent({ body: { goodId: 1, paidCourseId: 1 } }))
    expect(result.success).toBe(true)
    expect(result.data.coin).toBe(50) // 100 - 50
    expect(result.data.quantity).toBe(1)
    expect(_mockDb.transaction).toHaveBeenCalled()
  })

  it('成功购买课程专属商品', async () => {
    setMockAuthState({ id: 1, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn()
      .mockResolvedValueOnce([{ id: 2, name: 'Course Card', courseId: 1, price: 30, sellPrice: 15, stock: 10 }]) // goods
      .mockResolvedValueOnce([{ userId: 1, courseId: 1, coin: 100 }]) // userCourses
      .mockResolvedValueOnce([{ quantity: 1 }]) // bags
    const handler = (await import('../../server/api/goods/buy.post')).default
    const result = await handler(makeEvent({ body: { goodId: 2, paidCourseId: 1 } }))
    expect(result.success).toBe(true)
    expect(result.data.coin).toBe(70) // 100 - 30
  })

  it('购买有限库存商品触发库存递减', async () => {
    setMockAuthState({ id: 1, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn()
      .mockResolvedValueOnce([{ id: 3, name: '限量卡', courseId: 0, price: 10, sellPrice: 5, stock: 5 }]) // goods
      .mockResolvedValueOnce([{ userId: 1, courseId: 1, coin: 100 }]) // userCourses
      .mockResolvedValueOnce([{ quantity: 1 }]) // bags
    const handler = (await import('../../server/api/goods/buy.post')).default
    const result = await handler(makeEvent({ body: { goodId: 3, paidCourseId: 1 } }))
    expect(result.success).toBe(true)
    // Within transaction, should call update(goods) to decrement stock
    expect(_mockDb.update).toHaveBeenCalled()
  })
})

// ====================== sell.post.ts ======================

describe('API: goods/sell.post', () => {
  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/goods/sell.post')).default
    await expect(handler(makeEvent({ body: { goodId: 1, paidCourseId: 1 } }))).rejects.toThrow()
  })

  it('缺少参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/goods/sell.post')).default
    const result = await handler(makeEvent({ body: { goodId: 1 } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/参数/)
  })

  it('商品不存在返回失败', async () => {
    setMockAuthState({ id: 1, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValueOnce([]) // goods not found
    const handler = (await import('../../server/api/goods/sell.post')).default
    const result = await handler(makeEvent({ body: { goodId: 999, paidCourseId: 1 } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/不存在/)
  })

  it('背包中无此商品返回失败', async () => {
    setMockAuthState({ id: 1, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn()
      .mockResolvedValueOnce([{ id: 1, name: 'G1', courseId: 0, price: 50, sellPrice: 25, stock: -1 }]) // goods
      .mockResolvedValueOnce([]) // bags is empty
    const handler = (await import('../../server/api/goods/sell.post')).default
    const result = await handler(makeEvent({ body: { goodId: 1, paidCourseId: 1 } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/背包/)
  })

  it('未加入课程返回失败', async () => {
    setMockAuthState({ id: 1, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn()
      .mockResolvedValueOnce([{ id: 1, name: 'G1', courseId: 0, price: 50, sellPrice: 25, stock: -1 }]) // goods
      .mockResolvedValueOnce([{ userId: 1, goodId: 1, courseId: 0, quantity: 2 }]) // bags
      .mockResolvedValueOnce([]) // userCourses is empty
    const handler = (await import('../../server/api/goods/sell.post')).default
    const result = await handler(makeEvent({ body: { goodId: 1, paidCourseId: 1 } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/未加入/)
  })

  it('成功卖出商品（数量>1时递减）', async () => {
    setMockAuthState({ id: 1, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn()
      .mockResolvedValueOnce([{ id: 1, name: 'Homework Pass', courseId: 0, price: 50, sellPrice: 25, stock: -1 }]) // goods
      .mockResolvedValueOnce([{ userId: 1, goodId: 1, courseId: 0, quantity: 3 }]) // bags quantity=3
      .mockResolvedValueOnce([{ userId: 1, courseId: 1, coin: 10 }]) // userCourses
    const handler = (await import('../../server/api/goods/sell.post')).default
    const result = await handler(makeEvent({ body: { goodId: 1, paidCourseId: 1 } }))
    expect(result.success).toBe(true)
    expect(result.data.coin).toBe(35) // 10 + 25
    expect(result.data.quantity).toBe(2) // 3 - 1
    expect(_mockDb.transaction).toHaveBeenCalled()
    // quantity > 1 should call update(bags) instead of delete(bags)
    expect(_mockDb.update).toHaveBeenCalled()
    expect(_mockDb.delete).not.toHaveBeenCalled()
  })

  it('卖出最后一件时删除 bag 记录', async () => {
    setMockAuthState({ id: 1, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn()
      .mockResolvedValueOnce([{ id: 1, name: 'Homework Pass', courseId: 0, price: 50, sellPrice: 25, stock: -1 }]) // goods
      .mockResolvedValueOnce([{ userId: 1, goodId: 1, courseId: 0, quantity: 1 }]) // bags quantity=1
      .mockResolvedValueOnce([{ userId: 1, courseId: 1, coin: 10 }]) // userCourses
    const handler = (await import('../../server/api/goods/sell.post')).default
    const result = await handler(makeEvent({ body: { goodId: 1, paidCourseId: 1 } }))
    expect(result.success).toBe(true)
    expect(result.data.coin).toBe(35) // 10 + 25
    expect(result.data.quantity).toBe(0)
    // quantity = 1 should call delete(bags)
    expect(_mockDb.delete).toHaveBeenCalled()
  })
})
