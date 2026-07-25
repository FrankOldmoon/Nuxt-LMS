/**
 * 商店 composable：管理商品列表、背包、金币状态 + 买卖操作
 *
 * 数据流：
 * - fetchAll: 打开弹窗时并行拉取 coin / goods / bags
 * - buy(goodId): 调用 /api/goods/buy → 成功后刷新 coin + bags
 * - sell(goodId): 调用 /api/goods/sell → 成功后刷新 coin + bags
 */
import type { Ref } from 'vue'

export interface ShopGood {
  id: number
  name: string
  content: { icon?: string; color?: string; description?: string; emoji?: string }
  courseId: number
  price: number
  sellPrice: number
  stock: number
  type: string
  order: number
}

export interface BagItem {
  goodId: number
  quantity: number
  courseId: number
  name: string
  content: { icon?: string; color?: string; description?: string; emoji?: string }
  price: number
  sellPrice: number
  stock: number
  type: string
}

export function useShop(courseId: Ref<number | string>) {
  const { t } = useI18n()
  const toast = useToast()

  const coin = ref(0)
  const goods = ref<ShopGood[]>([])
  const bags = ref<BagItem[]>([])
  const loading = ref(false)
  const buyingId = ref<number | null>(null)
  const sellingId = ref<number | null>(null)

  const numericCourseId = computed(() => Number(courseId.value) || 0)

  async function fetchCoin() {
    try {
      const data = await cRequest<{ coin: number }>('/api/bags/coin', {
        query: { courseId: numericCourseId.value },
      })
      coin.value = data?.coin || 0
    } catch {
      // 静默
    }
  }

  async function fetchGoods() {
    try {
      const data = await cRequest<ShopGood[]>('/api/goods/list', {
        query: { courseId: numericCourseId.value },
      })
      goods.value = data || []
    } catch {
      goods.value = []
    }
  }

  async function fetchBags() {
    try {
      const data = await cRequest<BagItem[]>('/api/bags/my', {
        query: { courseId: numericCourseId.value },
      })
      bags.value = data || []
    } catch {
      bags.value = []
    }
  }

  async function fetchAll() {
    loading.value = true
    await Promise.all([fetchCoin(), fetchGoods(), fetchBags()])
    loading.value = false
  }

  async function buy(goodId: number) {
    const good = goods.value.find((g) => g.id === goodId)
    if (!good) return
    if (coin.value < good.price) {
      toast.add({ title: t('shop.insufficientCoin'), color: 'error' })
      return
    }
    if (good.stock !== -1 && good.stock <= 0) {
      toast.add({ title: t('shop.outOfStock'), color: 'error' })
      return
    }

    buyingId.value = goodId
    try {
      const result = await cRequest<{ coin: number; quantity: number }>('/api/goods/buy', {
        method: 'POST',
        body: { goodId, paidCourseId: numericCourseId.value },
      })
      coin.value = result.coin
      toast.add({ title: t('shop.buySuccess'), color: 'success' })
      await fetchBags()
      await fetchGoods()
    } catch (e: any) {
      toast.add({ title: e?.message || String(e), color: 'error' })
    } finally {
      buyingId.value = null
    }
  }

  async function sell(goodId: number) {
    sellingId.value = goodId
    try {
      const result = await cRequest<{ coin: number; quantity: number }>('/api/goods/sell', {
        method: 'POST',
        body: { goodId, paidCourseId: numericCourseId.value },
      })
      coin.value = result.coin
      toast.add({ title: t('shop.sellSuccess'), color: 'success' })
      await fetchBags()
      await fetchGoods()
    } catch (e: any) {
      toast.add({ title: e?.message || String(e), color: 'error' })
    } finally {
      sellingId.value = null
    }
  }

  /** 获取用户在背包中拥有某商品的数量 */
  function getOwnedQuantity(goodId: number, goodCourseId: number): number {
    const item = bags.value.find((b) => b.goodId === goodId && b.courseId === goodCourseId)
    return item?.quantity || 0
  }

  return {
    coin, goods, bags, loading, buyingId, sellingId,
    fetchAll, fetchCoin, fetchGoods, fetchBags, buy, sell, getOwnedQuantity,
  }
}
