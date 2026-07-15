/**
 * ueditor/render/nodes/option-box.vue component test
 * @see modules/lms/components/ueditor/render/nodes/option-box.vue
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

describe('ueditor/render/nodes/option-box.vue', () => {
  it('renders radio inputs when target=radio', async () => {
    const { default: OptionBox } = await import('../../../../../components/ueditor/render/nodes/option-box.vue')
    const wrapper = mount(OptionBox, {
      props: {
        node: {
          type: 'optionBox',
          attrs: {
            target: 'radio',
            items: [
              { key: 'a', label: 'A', checked: true },
              { key: 'b', label: 'B', checked: false },
            ],
          },
        },
      },
      global: _globalConfig,
    })
    expect(wrapper.find('.umo-option-box-radio-container').exists()).toBe(true)
    const radios = wrapper.findAll('input[type="radio"]')
    expect(radios.length).toBe(2)
    expect(radios[0].attributes('checked')).toBeDefined()
  })

  it('renders checkbox inputs when target is not radio', async () => {
    const { default: OptionBox } = await import('../../../../../components/ueditor/render/nodes/option-box.vue')
    const wrapper = mount(OptionBox, {
      props: {
        node: {
          type: 'optionBox',
          attrs: {
            target: 'checkbox',
            items: [{ key: 'x', label: 'X', checked: false }],
          },
        },
      },
      global: _globalConfig,
    })
    expect(wrapper.find('.umo-option-box-checkbox-container').exists()).toBe(true)
    expect(wrapper.findAll('input[type="checkbox"]').length).toBe(1)
  })

  it('renders no items when items attr is empty', async () => {
    const { default: OptionBox } = await import('../../../../../components/ueditor/render/nodes/option-box.vue')
    const wrapper = mount(OptionBox, {
      props: { node: { type: 'optionBox', attrs: { target: 'checkbox', items: [] } } },
      global: _globalConfig,
    })
    expect(wrapper.findAll('input').length).toBe(0)
  })
})
