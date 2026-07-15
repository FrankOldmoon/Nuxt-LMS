/**
 * course/shopModal/index.vue component test
 * @see modules/lms/components/course/shopModal/index.vue
 *
 * Shop modal: shop/bag tab + buy/sell buttons + coin display
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

// Mutable mock holder — vi.hoisted ensures initialization before vi.mock registration
const _shopMock = vi.hoisted(() => ({ current: null as any }))

vi.mock('../../../../components/course/shopModal/useShop', () => ({
  useShop: () => _shopMock.current,
}))

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  _shopMock.current = {
    coin: ref(100),
    goods: ref([
      { id: 1, name: 'Homework Pass', content: { icon: 'award', color: 'gold', description: 'Skip one homework assignment' },
        courseId: 0, price: 50, sellPrice: 25, stock: -1, type: 'item', order: 0 },
      { id: 2, name: 'Course Card', content: { icon: 'star', color: 'primary', description: 'Course item' },
        courseId: 1, price: 30, sellPrice: 15, stock: 10, type: 'item', order: 1 },
    ]),
    bags: ref([
      { goodId: 1, quantity: 2, courseId: 0, name: 'Homework Pass',
        content: { icon: 'award', color: 'gold', description: 'Skip one homework assignment' },
        price: 50, sellPrice: 25, stock: -1, type: 'item' },
    ]),
    loading: ref(false),
    buyingId: ref(null),
    sellingId: ref(null),
    buy: vi.fn(),
    sell: vi.fn(),
    fetchAll: vi.fn(),
    getOwnedQuantity: (goodId: number, _courseId: number) => (goodId === 1 ? 2 : 0),
  }
})

const _globalStubs = {
  UModal: {
    template: '<div v-if="open" class="modal"><slot name="content" /></div>',
    props: ['open', 'ui'],
  },
  UTabs: {
    template: '<div class="utabs"><button v-for="item in items" :key="item.value" class="utab" :data-value="item.value" @click="$emit(\'update:modelValue\', item.value)">{{ item.label }}</button></div>',
    props: ['modelValue', 'items'],
  },
  UButton: {
    template: '<button class="ubutton" :disabled="disabled" :data-loading="loading" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>',
    props: ['icon', 'label', 'color', 'variant', 'size', 'loading', 'disabled'],
  },
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  UBadge: {
    template: '<span class="ubadge">{{ label }}</span>',
    props: ['label', 'size', 'color', 'variant'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('course/shopModal/index.vue', () => {
  it('open=true 渲染弹窗 + 标题 + 金币余额', async () => {
    const { default: ShopModal } = await import('../../../../components/course/shopModal/index.vue')
    const wrapper = mount(ShopModal, {
      props: { open: true, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(true)
    expect(wrapper.text()).toContain('shop.title')
    expect(wrapper.text()).toContain('100') // coin
  })

  it('open=false 不渲染弹窗内容', async () => {
    const { default: ShopModal } = await import('../../../../components/course/shopModal/index.vue')
    const wrapper = mount(ShopModal, {
      props: { open: false, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('loading=true 显示加载提示 common.loading', async () => {
    _shopMock.current.loading = ref(true)
    const { default: ShopModal } = await import('../../../../components/course/shopModal/index.vue')
    const wrapper = mount(ShopModal, {
      props: { open: true, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('common.loading')
  })

  it('空商品列表显示 shop.emptyShop', async () => {
    _shopMock.current.goods = ref([])
    const { default: ShopModal } = await import('../../../../components/course/shopModal/index.vue')
    const wrapper = mount(ShopModal, {
      props: { open: true, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('shop.emptyShop')
  })

  it('有商品时渲染商品名称和价格', async () => {
    const { default: ShopModal } = await import('../../../../components/course/shopModal/index.vue')
    const wrapper = mount(ShopModal, {
      props: { open: true, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('Homework Pass')
    expect(wrapper.text()).toContain('50') // price of good 1
    expect(wrapper.text()).toContain('Course Card')
    expect(wrapper.text()).toContain('30') // price of good 2
  })

  it('全局商品（courseId=0）显示 goods.global badge', async () => {
    const { default: ShopModal } = await import('../../../../components/course/shopModal/index.vue')
    const wrapper = mount(ShopModal, {
      props: { open: true, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    const badges = wrapper.findAll('.ubadge')
    const globalBadge = badges.find((b) => b.text().includes('goods.global'))
    expect(globalBadge).toBeTruthy()
  })

  it('点击买入按钮调用 buy(goodId)', async () => {
    const { default: ShopModal } = await import('../../../../components/course/shopModal/index.vue')
    const wrapper = mount(ShopModal, {
      props: { open: true, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    const buttons = wrapper.findAll('.ubutton')
    const buyBtn = buttons.find((b) => b.text().includes('shop.buy'))
    expect(buyBtn).toBeTruthy()
    await buyBtn!.trigger('click')
    expect(_shopMock.current.buy).toHaveBeenCalledWith(1) // The first product id=1
  })

  it('coin < price 时买入按钮 disabled', async () => {
    _shopMock.current.coin = ref(10) // Lower than the price of both products (50 and 30)
    const { default: ShopModal } = await import('../../../../components/course/shopModal/index.vue')
    const wrapper = mount(ShopModal, {
      props: { open: true, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    const buttons = wrapper.findAll('.ubutton')
    const buyBtns = buttons.filter((b) => b.text().includes('shop.buy'))
    expect(buyBtns.length).toBeGreaterThanOrEqual(1)
    // All buy buttons should be disabled (coin=10 < 30 < 50)
    for (const btn of buyBtns) {
      expect(btn.attributes('disabled')).toBeDefined()
    }
  })

  it('空背包显示 shop.emptyBag', async () => {
    _shopMock.current.bags = ref([])
    const { default: ShopModal } = await import('../../../../components/course/shopModal/index.vue')
    const wrapper = mount(ShopModal, {
      props: { open: true, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('shop.emptyBag')
  })

  it('背包有物品时渲染名称 + 点击卖出按钮调用 sell(goodId)', async () => {
    const { default: ShopModal } = await import('../../../../components/course/shopModal/index.vue')
    const wrapper = mount(ShopModal, {
      props: { open: true, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    // Item names in bag (v-show keeps DOM present)
    expect(wrapper.text()).toContain('Homework Pass')
    const buttons = wrapper.findAll('.ubutton')
    const sellBtn = buttons.find((b) => b.text().includes('shop.sell'))
    expect(sellBtn).toBeTruthy()
    await sellBtn!.trigger('click')
    expect(_shopMock.current.sell).toHaveBeenCalledWith(1) // Bag item goodId=1
  })

  it('渲染商店/背包 Tab 标签', async () => {
    const { default: ShopModal } = await import('../../../../components/course/shopModal/index.vue')
    const wrapper = mount(ShopModal, {
      props: { open: true, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('shop.tabShop')
    expect(wrapper.text()).toContain('shop.tabBag')
  })

  it('正确接收 courseId prop', async () => {
    const { default: ShopModal } = await import('../../../../components/course/shopModal/index.vue')
    const wrapper = mount(ShopModal, {
      props: { open: true, courseId: 42 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('courseId')).toBe(42)
  })
})
