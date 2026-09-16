/**
 * Chart 组件测试
 * @see modules/base/components/chart/index.vue
 *
 * ECharts 封装：CDN 加载 + 初始化 + 自适应 + 暴露方法
 * 依赖 useECharts() composable（auto-import），测试中通过 globalThis 注入桩
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, computed } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({
    locale: { value: 'en' },
    t: (k: string) => k,
    d: (v: any) => String(v),
  })
  // 桩 useECharts composable（auto-import），避免加载 ECharts CDN
  ;(globalThis as any).useECharts = (
    option: () => any,
    _theme: () => any,
    _renderer: () => string,
    width: () => any,
    height: () => any,
    _autoResize: () => boolean,
    _loading: () => boolean,
    _loadingOption: () => any,
    _group: () => string,
    _initOptions: () => any,
    _notMerge: () => boolean,
    _lazyUpdate: () => boolean,
    _onReady: (chart: any) => void,
    _onClick: (params: any) => void,
    _onRendered: () => void,
  ) => ({
    chartRef: ref<HTMLElement | null>(null),
    containerStyle: computed(() => ({
      width: typeof width() === 'number' ? `${width()}px` : String(width()),
      height: typeof height() === 'number' ? `${height()}px` : String(height()),
    })),
    resize: vi.fn(),
    getInstance: () => null,
    setOption: vi.fn(),
    dispatchAction: vi.fn(),
  })
})

afterEach(() => {
  delete (globalThis as any).useECharts
})

const _globalConfig = {
  mocks: {
    $t: (k: string) => k,
    $i18n: { t: (k: string) => k, locale: { value: 'en' } },
  },
}

describe('chart/index.vue', () => {
  it('默认渲染：挂载容器元素', async () => {
    const { default: Chart } = await import('../../../components/chart/index.vue')
    const wrapper = mount(Chart, {
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.chart-container').exists()).toBe(true)
  })

  it('option prop 默认为空对象', async () => {
    const { default: Chart } = await import('../../../components/chart/index.vue')
    const wrapper = mount(Chart, {
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('option')).toEqual({})
  })

  it('接受 option prop（ECharts 配置）', async () => {
    const { default: Chart } = await import('../../../components/chart/index.vue')
    const option = {
      xAxis: { type: 'category', data: ['A', 'B', 'C'] },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: [10, 20, 30] }],
    }
    const wrapper = mount(Chart, {
      props: { option },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('option')).toEqual(option)
  })

  it('width/height props 默认值（100% / 300）', async () => {
    const { default: Chart } = await import('../../../components/chart/index.vue')
    const wrapper = mount(Chart, {
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('width')).toBe('100%')
    expect(wrapper.props('height')).toBe(300)
  })

  it('renderer prop 默认为 canvas', async () => {
    const { default: Chart } = await import('../../../components/chart/index.vue')
    const wrapper = mount(Chart, {
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('renderer')).toBe('canvas')
  })

  it('autoResize / loading / notMerge / lazyUpdate 默认值', async () => {
    const { default: Chart } = await import('../../../components/chart/index.vue')
    const wrapper = mount(Chart, {
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('autoResize')).toBe(true)
    expect(wrapper.props('loading')).toBe(false)
    expect(wrapper.props('notMerge')).toBe(false)
    expect(wrapper.props('lazyUpdate')).toBe(false)
  })

  it('暴露 resize / getInstance / setOption / dispatchAction 方法', async () => {
    const { default: Chart } = await import('../../../components/chart/index.vue')
    const wrapper = mount(Chart, {
      global: _globalConfig,
    })
    await flushPromises()
    const vm: any = wrapper.vm
    expect(typeof vm.resize).toBe('function')
    expect(typeof vm.getInstance).toBe('function')
    expect(typeof vm.setOption).toBe('function')
    expect(typeof vm.dispatchAction).toBe('function')
  })
})
