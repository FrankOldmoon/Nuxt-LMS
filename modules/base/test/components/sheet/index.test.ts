/**
 * Sheet component tests
 * @see modules/base/components/sheet/index.vue
 *
 * Univer online spreadsheet wrapper: CDN loading + initialization + data read/write
 * Depends on useUniverSheet() composable (auto-import), injected via globalThis in tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({
    locale: { value: 'en' },
    t: (k: string) => k,
    d: (v: any) => String(v),
  })
  // Stub useUniverSheet composable (auto-import) to avoid loading Univer CDN
  ;(globalThis as any).useUniverSheet = (
    _headers: () => any[],
    _colWidths: () => Record<string, number>,
    _rowCount: () => number,
    _active: () => boolean,
    _showTools: () => boolean,
    _showFooter: () => boolean,
    _showContextMenu: () => boolean,
    _initialData: () => any,
    _onChange: () => void,
  ) => ({
    sheetContainer: ref<HTMLElement | null>(null),
    getRows: vi.fn(() => []),
    getCellData: vi.fn(() => null),
    setSortedRows: vi.fn(),
    reset: vi.fn(),
  })
})

afterEach(() => {
  delete (globalThis as any).useUniverSheet
})

const _globalConfig = {
  mocks: {
    $t: (k: string) => k,
    $i18n: { t: (k: string) => k, locale: { value: 'en' } },
  },
}

describe('sheet/index.vue', () => {
  it('默认渲染：挂载容器元素', async () => {
    const { default: Sheet } = await import('../../../components/sheet/index.vue')
    const wrapper = mount(Sheet, {
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('div').exists()).toBe(true)
  })

  it('headers prop 默认为空数组', async () => {
    const { default: Sheet } = await import('../../../components/sheet/index.vue')
    const wrapper = mount(Sheet, {
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('headers')).toEqual([])
  })

  it('接受 headers prop（表头定义）', async () => {
    const { default: Sheet } = await import('../../../components/sheet/index.vue')
    const headers = [
      { field: 'name', title: '姓名' },
      { field: 'age', title: '年龄' },
    ]
    const wrapper = mount(Sheet, {
      props: { headers },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('headers')).toEqual(headers)
  })

  it('rowCount prop 默认为 30', async () => {
    const { default: Sheet } = await import('../../../components/sheet/index.vue')
    const wrapper = mount(Sheet, {
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('rowCount')).toBe(30)
  })

  it('active / showTools / showFooter / showContextMenu 默认为 true', async () => {
    const { default: Sheet } = await import('../../../components/sheet/index.vue')
    const wrapper = mount(Sheet, {
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('active')).toBe(true)
    expect(wrapper.props('showTools')).toBe(true)
    expect(wrapper.props('showFooter')).toBe(true)
    expect(wrapper.props('showContextMenu')).toBe(true)
  })

  it('colWidths / initialData 默认值', async () => {
    const { default: Sheet } = await import('../../../components/sheet/index.vue')
    const wrapper = mount(Sheet, {
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('colWidths')).toEqual({})
    expect(wrapper.props('initialData')).toBeNull()
  })

  it('暴露 getRows / getCellData / setSortedRows / reset 方法', async () => {
    const { default: Sheet } = await import('../../../components/sheet/index.vue')
    const wrapper = mount(Sheet, {
      global: _globalConfig,
    })
    await flushPromises()
    const vm: any = wrapper.vm
    expect(typeof vm.getRows).toBe('function')
    expect(typeof vm.getCellData).toBe('function')
    expect(typeof vm.setSortedRows).toBe('function')
    expect(typeof vm.reset).toBe('function')
  })
})
