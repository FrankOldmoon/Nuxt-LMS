/**
 * useShop composable test
 * @see modules/lms/components/course/shopModal/useShop.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import {
  resetAllStubs,
  setMockFetchHandler,
  clearMockFetchHandler,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  clearMockFetchHandler()
})

describe('composables/useShop', () => {
  it('初始状态为空', async () => {
    const { useShop } = await import('../../components/course/shopModal/useShop')
    const { coin, goods, bags, loading } = useShop(ref(1))
    expect(coin.value).toBe(0)
    expect(goods.value).toEqual([])
    expect(bags.value).toEqual([])
    expect(loading.value).toBe(false)
  })

  it('fetchAll 并行加载 coin/goods/bags', async () => {
    setMockFetchHandler(async (url: string) => {
      if (url.startsWith('/api/bags/coin')) return { data: { coin: 150 }, success: true, msg: '' }
      if (url.startsWith('/api/goods/list')) return { data: [{ id: 1, name: 'Homework Pass', price: 50 }], success: true, msg: '' }
      if (url.startsWith('/api/bags/my')) return { data: [{ goodId: 1, quantity: 2 }], success: true, msg: '' }
      return { data: null, success: true, msg: '' }
    })
    const { useShop } = await import('../../components/course/shopModal/useShop')
    const { coin, goods, bags, fetchAll, loading } = useShop(ref(1))
    await fetchAll()
    expect(coin.value).toBe(150)
    expect(goods.value).toHaveLength(1)
    expect(goods.value[0].name).toBe('Homework Pass')
    expect(bags.value).toHaveLength(1)
    expect(loading.value).toBe(false)
  })

  it('buy 成功后更新 coin 和 bags', async () => {
    let buyCalled = false
    setMockFetchHandler(async (url: string, opts: any) => {
      if (url.startsWith('/api/goods/buy')) {
        buyCalled = true
        return { data: { coin: 100, quantity: 1 }, success: true, msg: '' }
      }
      if (url.startsWith('/api/bags/coin')) return { data: { coin: 150 }, success: true, msg: '' }
      if (url.startsWith('/api/goods/list')) return { data: [{ id: 1, name: 'G1', price: 50, courseId: 0 }], success: true, msg: '' }
      if (url.startsWith('/api/bags/my')) return { data: [{ goodId: 1, quantity: 1 }], success: true, msg: '' }
      return { data: null, success: true, msg: '' }
    })
    const { useShop } = await import('../../components/course/shopModal/useShop')
    const { coin, buy, fetchAll } = useShop(ref(1))
    await fetchAll()
    expect(coin.value).toBe(150)
    await buy(1)
    expect(buyCalled).toBe(true)
    expect(coin.value).toBe(100) // new coin returned by buy
  })

  it('buy coin 不足时不调用 API', async () => {
    let buyCalled = false
    setMockFetchHandler(async (url: string) => {
      if (url.startsWith('/api/goods/buy')) {
        buyCalled = true
        return { data: { coin: 0, quantity: 0 }, success: true, msg: '' }
      }
      if (url.startsWith('/api/bags/coin')) return { data: { coin: 10 }, success: true, msg: '' }
      if (url.startsWith('/api/goods/list')) return { data: [{ id: 1, name: 'G1', price: 50, courseId: 0 }], success: true, msg: '' }
      if (url.startsWith('/api/bags/my')) return { data: [], success: true, msg: '' }
      return { data: null, success: true, msg: '' }
    })
    const { useShop } = await import('../../components/course/shopModal/useShop')
    const { buy, fetchAll } = useShop(ref(1))
    await fetchAll()
    await buy(1)
    expect(buyCalled).toBe(false)
  })

  it('sell 成功后更新 coin', async () => {
    setMockFetchHandler(async (url: string) => {
      if (url.startsWith('/api/goods/sell')) return { data: { coin: 175, quantity: 0 }, success: true, msg: '' }
      if (url.startsWith('/api/bags/coin')) return { data: { coin: 150 }, success: true, msg: '' }
      if (url.startsWith('/api/goods/list')) return { data: [], success: true, msg: '' }
      if (url.startsWith('/api/bags/my')) return { data: [{ goodId: 1, quantity: 1, courseId: 0 }], success: true, msg: '' }
      return { data: null, success: true, msg: '' }
    })
    const { useShop } = await import('../../components/course/shopModal/useShop')
    const { coin, sell, fetchAll } = useShop(ref(1))
    await fetchAll()
    await sell(1)
    expect(coin.value).toBe(175)
  })

  it('getOwnedQuantity 返回正确数量', async () => {
    setMockFetchHandler(async (url: string) => {
      if (url.startsWith('/api/bags/coin')) return { data: { coin: 0 }, success: true, msg: '' }
      if (url.startsWith('/api/goods/list')) return { data: [], success: true, msg: '' }
      if (url.startsWith('/api/bags/my')) return { data: [{ goodId: 1, quantity: 3, courseId: 0 }, { goodId: 2, quantity: 1, courseId: 1 }], success: true, msg: '' }
      return { data: null, success: true, msg: '' }
    })
    const { useShop } = await import('../../components/course/shopModal/useShop')
    const { getOwnedQuantity, fetchAll } = useShop(ref(1))
    await fetchAll()
    expect(getOwnedQuantity(1, 0)).toBe(3)
    expect(getOwnedQuantity(2, 1)).toBe(1)
    expect(getOwnedQuantity(999, 0)).toBe(0)
  })
})
