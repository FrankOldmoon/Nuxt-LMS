/**
 * ueditor/render/nodes/echarts.vue 组件测试
 * @see modules/lms/components/ueditor/render/nodes/echarts.vue
 *
 * echarts 在测试环境从 CDN 动态加载，window.echarts 不可用，
 * 组件仍应挂载并渲染容器。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalConfig = {
  mocks: { $t: (k: string) => k, $i18n: { t: (k: string) => k, locale: { value: 'en' } } },
  stubs: {},
}

describe('ueditor/render/nodes/echarts.vue', () => {
  it('renders echarts container with body div', async () => {
    const { default: EchartsView } = await import('../../../../../components/ueditor/render/nodes/echarts.vue')
    const wrapper = mount(EchartsView, {
      props: { node: { type: 'echarts', attrs: { height: 300 } } },
      global: _globalConfig,
    })
    expect(wrapper.find('.umo-node-echarts').exists()).toBe(true)
    expect(wrapper.find('.umo-node-echarts-body').exists()).toBe(true)
  })

  it('applies height from attrs to body', async () => {
    const { default: EchartsView } = await import('../../../../../components/ueditor/render/nodes/echarts.vue')
    const wrapper = mount(EchartsView, {
      props: { node: { type: 'echarts', attrs: { height: 400 } } },
      global: _globalConfig,
    })
    expect(wrapper.find('.umo-node-echarts-body').attributes('style') || '').toContain('height: 400px')
  })

  it('defaults height to 200 when not specified', async () => {
    const { default: EchartsView } = await import('../../../../../components/ueditor/render/nodes/echarts.vue')
    const wrapper = mount(EchartsView, {
      props: { node: { type: 'echarts', attrs: {} } },
      global: _globalConfig,
    })
    expect(wrapper.find('.umo-node-echarts-body').attributes('style') || '').toContain('height: 200px')
  })
})
