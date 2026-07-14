/**
 * useGoodsEditor composable 测试
 * @see modules/lms/components/lms/useGoodsEditor.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// composable 测试无组件上下文，让 onMounted 立即执行回调以触发 loadGoods
vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue')>()
  return {
    ...actual,
    onMounted: (cb: any) => { cb() },
  }
})

import { computed } from 'vue'
import {
  resetAllStubs,
  setMockFetchHandler,
  clearMockFetchHandler,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  clearMockFetchHandler()
})

describe('composables/useGoodsEditor', () => {
  it('初始状态：loading=true, goods 为空', async () => {
    setMockFetchHandler(async () => ({ data: [], success: true, msg: '' }))
    const { useGoodsEditor } = await import('../../components/lms/useGoodsEditor')
    const { loading } = useGoodsEditor(computed(() => 0))
    // onMounted 会触发 loadGoods，但需要 nextTick
    expect(loading.value).toBe(true)
  })

  it('loadGoods 加载商品列表', async () => {
    setMockFetchHandler(async (url: string) => {
      if (url.startsWith('/api/goods/manage')) {
        return { data: [{ id: 1, name: 'Homework Pass', price: 50, sellPrice: 25, stock: -1, content: {}, courseId: 0 }], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useGoodsEditor } = await import('../../components/lms/useGoodsEditor')
    const { goods, loading } = useGoodsEditor(computed(() => 0))
    // 等待 onMounted + loadGoods 完成
    await new Promise((r) => setTimeout(r, 10))
    expect(loading.value).toBe(false)
    expect(goods.value).toHaveLength(1)
    expect(goods.value[0].name).toBe('Homework Pass')
  })

  it('addGood 添加新商品到列表', async () => {
    setMockFetchHandler(async () => ({ data: [], success: true, msg: '' }))
    const { useGoodsEditor } = await import('../../components/lms/useGoodsEditor')
    const { goods, addGood } = useGoodsEditor(computed(() => 1))
    await new Promise((r) => setTimeout(r, 10))
    const initialLen = goods.value.length
    addGood()
    expect(goods.value).toHaveLength(initialLen + 1)
    expect(goods.value[goods.value.length - 1].id).toBe(0) // 新商品 id=0
    expect(goods.value[goods.value.length - 1].courseId).toBe(1)
  })

  it('deleteGood 未保存的商品直接从列表移除', async () => {
    setMockFetchHandler(async () => ({ data: [], success: true, msg: '' }))
    const { useGoodsEditor } = await import('../../components/lms/useGoodsEditor')
    const { goods, addGood, deleteGood } = useGoodsEditor(computed(() => 0))
    await new Promise((r) => setTimeout(r, 10))
    addGood()
    const len = goods.value.length
    deleteGood(0) // id=0 的未保存商品
    expect(goods.value).toHaveLength(len - 1)
  })

  it('saveAll 对新商品调用 add API', async () => {
    let addCalled = false
    setMockFetchHandler(async (url: string, _opts: any) => {
      if (url.startsWith('/api/goods/add')) {
        addCalled = true
        return { data: { id: 99, name: 'New Good' }, success: true, msg: '' }
      }
      if (url.startsWith('/api/goods/manage')) return { data: [], success: true, msg: '' }
      return { data: null, success: true, msg: '' }
    })
    const { useGoodsEditor } = await import('../../components/lms/useGoodsEditor')
    const { goods, addGood, saveAll, saving } = useGoodsEditor(computed(() => 0))
    await new Promise((r) => setTimeout(r, 10))
    addGood()
    goods.value[goods.value.length - 1].name = 'New Good'
    await saveAll()
    expect(addCalled).toBe(true)
    expect(saving.value).toBe(false)
    expect(goods.value[goods.value.length - 1].id).toBe(99)
  })

  it('saveAll 对已有商品调用 update API', async () => {
    let updateCalled = false
    setMockFetchHandler(async (url: string, _opts: any) => {
      if (url.startsWith('/api/goods/update')) {
        updateCalled = true
        return { data: { id: 1, name: 'Updated' }, success: true, msg: '' }
      }
      if (url.startsWith('/api/goods/manage')) {
        return { data: [{ id: 1, name: 'Old', price: 10, sellPrice: 5, stock: -1, content: {}, courseId: 0 }], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useGoodsEditor } = await import('../../components/lms/useGoodsEditor')
    const { goods, saveAll } = useGoodsEditor(computed(() => 0))
    await new Promise((r) => setTimeout(r, 10))
    goods.value[0].name = 'Updated'
    await saveAll()
    expect(updateCalled).toBe(true)
  })
})
