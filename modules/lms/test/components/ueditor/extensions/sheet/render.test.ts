/**
 * sheet/render.vue 组件测试
 * @see modules/lms/components/ueditor/extensions/nodes/vue/sheet/render.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  Sheet: { template: '<div class="sheet-stub" />', props: ['colWidths', 'rowCount', 'showTools', 'showFooter', 'showContextMenu', 'active', 'initialData'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('sheet/render.vue', () => {
  it('mounts and renders Sheet component', async () => {
    const { default: SheetRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/sheet/render.vue'
    )
    const wrapper = mount(SheetRender, {
      props: { node: { attrs: { content: JSON.stringify({ height: 300 }) } } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.sheet-render-container').exists()).toBe(true)
    expect(wrapper.find('.sheet-stub').exists()).toBe(true)
  })

  it('applies height from config', async () => {
    const { default: SheetRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/sheet/render.vue'
    )
    const wrapper = mount(SheetRender, {
      props: { node: { attrs: { content: JSON.stringify({ height: 450 }) } } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.sheet-render-body').attributes('style') || '').toContain('450px')
  })

  it('uses default height 300 when not set', async () => {
    const { default: SheetRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/sheet/render.vue'
    )
    const wrapper = mount(SheetRender, {
      props: { node: { attrs: { content: JSON.stringify({}) } } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.sheet-render-body').attributes('style') || '').toContain('300px')
  })
})
