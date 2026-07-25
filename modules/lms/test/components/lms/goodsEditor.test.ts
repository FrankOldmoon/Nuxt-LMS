/**
 * lms/goodsEditor.vue 组件测试
 * @see modules/lms/components/lms/goodsEditor.vue
 *
 * 商品编辑器：全局/课程标题 + 列表 + 新增/删除/保存
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

// 可变 mock holder — vi.hoisted 保证在 vi.mock 注册之前初始化
const _editorMock = vi.hoisted(() => ({ current: null as any }))

vi.mock('../../../components/lms/useGoodsEditor', () => ({
  useGoodsEditor: () => _editorMock.current,
}))

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  _editorMock.current = {
    loading: ref(false),
    goods: ref([]),
    fullIconName: (name: string) => name || 'i-lucide-package',
    iconColorClass: (color: string) => `text-${color || 'primary'}`,
    colorOpts: [
      { label: 'Bronze', value: 'bronze' },
      { label: 'Silver', value: 'silver' },
      { label: 'Gold', value: 'gold' },
    ],
    deletingId: ref(null),
    deleteGood: vi.fn(),
    addGood: vi.fn(),
    saving: ref(false),
    saveAll: vi.fn(),
  }
})

const _globalStubs = {
  USeparator: {
    template: '<div class="useparator">{{ label }}</div>',
    props: ['label'],
  },
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  UInput: {
    template: '<input class="uinput" :value="modelValue" :type="type" :placeholder="placeholder" />',
    props: ['modelValue', 'type', 'size', 'placeholder'],
  },
  USelect: {
    template: '<select class="uselect"><option v-for="o in items" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
    props: ['modelValue', 'items', 'size'],
  },
  UFormField: {
    template: '<div class="uformfield"><label>{{ label }}</label><slot /></div>',
    props: ['label', 'size'],
  },
  UButton: {
    template: '<button class="ubutton" :data-icon="icon" :disabled="loading" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>',
    props: ['icon', 'label', 'color', 'variant', 'size', 'loading', 'block'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('lms/goodsEditor.vue', () => {
  it('courseId=0 渲染全局标题 goods.global', async () => {
    const { default: GoodsEditor } = await import('../../../components/lms/goodsEditor.vue')
    const wrapper = mount(GoodsEditor, {
      props: { courseId: 0 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.useparator').text()).toContain('goods.global')
  })

  it('courseId=1 渲染课程标题 goods.course', async () => {
    const { default: GoodsEditor } = await import('../../../components/lms/goodsEditor.vue')
    const wrapper = mount(GoodsEditor, {
      props: { courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.useparator').text()).toContain('goods.course')
  })

  it('loading=true 显示加载图标（不渲染新增/保存按钮）', async () => {
    _editorMock.current.loading = ref(true)
    const { default: GoodsEditor } = await import('../../../components/lms/goodsEditor.vue')
    const wrapper = mount(GoodsEditor, {
      props: { courseId: 0 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.uicon').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('goods.add')
    expect(wrapper.text()).not.toContain('common.save')
  })

  it('loading=false + 空商品列表渲染新增按钮 goods.add', async () => {
    const { default: GoodsEditor } = await import('../../../components/lms/goodsEditor.vue')
    const wrapper = mount(GoodsEditor, {
      props: { courseId: 0 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('goods.add')
  })

  it('渲染保存按钮 common.save', async () => {
    const { default: GoodsEditor } = await import('../../../components/lms/goodsEditor.vue')
    const wrapper = mount(GoodsEditor, {
      props: { courseId: 0 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('common.save')
  })

  it('点击新增按钮调用 addGood', async () => {
    const { default: GoodsEditor } = await import('../../../components/lms/goodsEditor.vue')
    const wrapper = mount(GoodsEditor, {
      props: { courseId: 0 },
      global: _globalConfig,
    })
    await flushPromises()
    const buttons = wrapper.findAll('.ubutton')
    const addBtn = buttons.find((b) => b.text().includes('goods.add'))
    expect(addBtn).toBeTruthy()
    await addBtn!.trigger('click')
    expect(_editorMock.current.addGood).toHaveBeenCalled()
  })

  it('点击保存按钮调用 saveAll', async () => {
    const { default: GoodsEditor } = await import('../../../components/lms/goodsEditor.vue')
    const wrapper = mount(GoodsEditor, {
      props: { courseId: 0 },
      global: _globalConfig,
    })
    await flushPromises()
    const buttons = wrapper.findAll('.ubutton')
    const saveBtn = buttons.find((b) => b.text().includes('common.save'))
    expect(saveBtn).toBeTruthy()
    await saveBtn!.trigger('click')
    expect(_editorMock.current.saveAll).toHaveBeenCalled()
  })

  it('有商品时渲染商品行 + 名称输入框 + 删除按钮', async () => {
    _editorMock.current.goods = ref([
      { id: 1, name: 'Homework Pass', content: { icon: 'award', color: 'gold', description: '', emoji: '' },
        courseId: 0, price: 50, sellPrice: 25, stock: -1, type: 'item', order: 0 },
    ])
    const { default: GoodsEditor } = await import('../../../components/lms/goodsEditor.vue')
    const wrapper = mount(GoodsEditor, {
      props: { courseId: 0 },
      global: _globalConfig,
    })
    await flushPromises()
    // 1 个商品 → 6 个 UInput（name/icon/description/price/sellPrice/stock）
    const inputs = wrapper.findAll('.uinput')
    expect(inputs.length).toBe(6)
    // 第一个输入框是商品名称
    expect(inputs[0].attributes('value')).toBe('Homework Pass')
    // 删除按钮存在（通过 icon 数据属性定位）
    expect(wrapper.find('[data-icon="i-lucide-trash-2"]').exists()).toBe(true)
  })

  it('点击删除按钮调用 deleteGood(good.id)', async () => {
    _editorMock.current.goods = ref([
      { id: 1, name: 'Homework Pass', content: { icon: 'award', color: 'gold', description: '', emoji: '' },
        courseId: 0, price: 50, sellPrice: 25, stock: -1, type: 'item', order: 0 },
    ])
    const { default: GoodsEditor } = await import('../../../components/lms/goodsEditor.vue')
    const wrapper = mount(GoodsEditor, {
      props: { courseId: 0 },
      global: _globalConfig,
    })
    await flushPromises()
    const deleteBtn = wrapper.find('[data-icon="i-lucide-trash-2"]')
    expect(deleteBtn.exists()).toBe(true)
    await deleteBtn.trigger('click')
    expect(_editorMock.current.deleteGood).toHaveBeenCalledWith(1)
  })
})
