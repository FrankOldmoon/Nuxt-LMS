/**
 * composables/useECharts 测试
 * @see modules/base/composables/useECharts.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

// 创建 noop 的参数函数
function noop() { return undefined as any }
function makeArgs(overrides: Partial<Record<string, () => any>> = {}) {
  const defaults = {
    option: () => ({}),
    theme: () => undefined,
    renderer: () => 'canvas',
    width: () => '100%',
    height: () => 300,
    autoResize: () => false,
    loading: () => false,
    loadingOption: () => undefined,
    group: () => '',
    initOptions: () => ({}),
    notMerge: () => false,
    lazyUpdate: () => false,
    cdnUrl: () => 'https://cdn.example.com/echarts.js',
    onReady: (_chart: any) => {},
    onClick: (_p: any) => {},
    onRendered: () => {},
  }
  return { ...defaults, ...overrides }
}

describe('composables/useECharts - chartRef & containerStyle', () => {
  it('chartRef 初始为 null', async () => {
    const { useECharts } = await import('../../composables/useECharts')
    const { chartRef } = useECharts(...Object.values(makeArgs()) as any)
    expect(chartRef.value).toBeNull()
  })

  it('containerStyle 把数字尺寸转为 px 字符串', async () => {
    const { useECharts } = await import('../../composables/useECharts')
    const { containerStyle } = useECharts(...Object.values(makeArgs({ width: () => 500, height: () => 300 })) as any)
    expect(containerStyle.value).toEqual({ width: '500px', height: '300px' })
  })

  it('containerStyle 保留字符串尺寸', async () => {
    const { useECharts } = await import('../../composables/useECharts')
    const { containerStyle } = useECharts(...Object.values(makeArgs({ width: () => '100%', height: () => '50vh' })) as any)
    expect(containerStyle.value).toEqual({ width: '100%', height: '50vh' })
  })

  it('containerStyle 对空值返回 undefined', async () => {
    const { useECharts } = await import('../../composables/useECharts')
    const { containerStyle } = useECharts(...Object.values(makeArgs({ width: () => '', height: () => null as any })) as any)
    expect(containerStyle.value).toEqual({ width: undefined, height: undefined })
  })
})

describe('composables/useECharts - 暴露方法（chart 未初始化时为 no-op）', () => {
  it('resize / setOption / dispatchAction 不抛错', async () => {
    const { useECharts } = await import('../../composables/useECharts')
    const { resize, setOption, dispatchAction, getInstance } = useECharts(...Object.values(makeArgs()) as any)
    expect(getInstance()).toBeNull()
    expect(() => resize()).not.toThrow()
    expect(() => setOption({ series: [] })).not.toThrow()
    expect(() => dispatchAction({ type: 'highlight' })).not.toThrow()
  })

  it('setOption 在 chart 为 null 时不抛错', async () => {
    const { useECharts } = await import('../../composables/useECharts')
    const { setOption, getInstance } = useECharts(...Object.values(makeArgs()) as any)
    expect(getInstance()).toBeNull()
    setOption({ title: { text: 'x' } }, true, false)
  })
})
