/**
 * ueditor/render/nodes/list-item.vue component test
 * @see modules/lms/components/ueditor/render/nodes/list-item.vue
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

describe('ueditor/render/nodes/list-item.vue', () => {
  it('renders an <li> with content', async () => {
    const { default: ListItem } = await import('../../../../../components/ueditor/render/nodes/list-item.vue')
    const wrapper = mount(ListItem, {
      props: { node: { type: 'listItem', content: [{ type: 'text', text: 'List item text' }] } },
      global: _globalConfig,
    })
    expect(wrapper.find('li').exists()).toBe(true)
    expect(wrapper.html()).toContain('List item text')
  })

  it('renders without error when blockKey is not provided (no tracking)', async () => {
    const { default: ListItem } = await import('../../../../../components/ueditor/render/nodes/list-item.vue')
    const wrapper = mount(ListItem, {
      props: { node: { type: 'listItem', content: [] } },
      global: _globalConfig,
    })
    expect(wrapper.find('li').exists()).toBe(true)
    expect(wrapper.find('li').classes()).not.toContain('reading-hover-border')
    expect(wrapper.find('li').classes()).not.toContain('reading-visited-border')
  })

  it('applies reading-hover-border on mouseenter when blockKey provided', async () => {
    const { default: ListItem } = await import('../../../../../components/ueditor/render/nodes/list-item.vue')
    const wrapper = mount(ListItem, {
      props: { node: { type: 'listItem', content: [] }, blockKey: '0.1' },
      global: _globalConfig,
    })
    await wrapper.find('li').trigger('mouseenter')
    expect(wrapper.find('li').classes()).toContain('reading-hover-border')
  })

  it('accepts a blockKey prop without error', async () => {
    const { default: ListItem } = await import('../../../../../components/ueditor/render/nodes/list-item.vue')
    const wrapper = mount(ListItem, {
      props: { node: { type: 'listItem', content: [] }, blockKey: '0.1' },
      global: _globalConfig,
    })
    expect(wrapper.find('li').exists()).toBe(true)
  })
})
