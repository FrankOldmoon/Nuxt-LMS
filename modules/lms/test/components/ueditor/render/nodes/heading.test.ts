/**
 * ueditor/render/nodes/heading.vue component test
 * @see modules/lms/components/ueditor/render/nodes/heading.vue
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

describe('ueditor/render/nodes/heading.vue', () => {
  it('renders h1 by default (no level attr)', async () => {
    const { default: Heading } = await import('../../../../../components/ueditor/render/nodes/heading.vue')
    const wrapper = mount(Heading, {
      props: { node: { type: 'heading', attrs: {}, content: [{ type: 'text', text: 'Title' }] } },
      global: _globalConfig,
    })
    expect(wrapper.find('h1').exists()).toBe(true)
    expect(wrapper.html()).toContain('Title')
  })

  it('renders h2 when level=2', async () => {
    const { default: Heading } = await import('../../../../../components/ueditor/render/nodes/heading.vue')
    const wrapper = mount(Heading, {
      props: { node: { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Sub' }] } },
      global: _globalConfig,
    })
    expect(wrapper.find('h2').exists()).toBe(true)
  })

  it('binds id attr to the heading element', async () => {
    const { default: Heading } = await import('../../../../../components/ueditor/render/nodes/heading.vue')
    const wrapper = mount(Heading, {
      props: { node: { type: 'heading', attrs: { level: 3, id: 'my-anchor' }, content: [] } },
      global: _globalConfig,
    })
    expect(wrapper.find('h3').attributes('id')).toBe('my-anchor')
  })
})
