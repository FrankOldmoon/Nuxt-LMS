/**
 * fireworks 组件测试 (render)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/render/fireworks.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

describe('question/render/fireworks.vue', () => {
  it('mounts and renders a canvas element', async () => {
    const { default: Fireworks } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/fireworks.vue'
    )
    const wrapper = mount(Fireworks, {
      global: { mocks: { $t: (k: string) => k } },
    })
    expect(wrapper.find('canvas').exists()).toBe(true)
    expect(wrapper.find('.fireworks-canvas').exists()).toBe(true)
  })

  it('accepts no props (standalone effect)', async () => {
    const { default: Fireworks } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/fireworks.vue'
    )
    const wrapper = mount(Fireworks, {
      global: { mocks: { $t: (k: string) => k } },
    })
    expect(wrapper.exists()).toBe(true)
  })
})
