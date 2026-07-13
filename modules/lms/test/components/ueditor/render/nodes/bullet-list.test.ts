/**
 * ueditor/render/nodes/bullet-list.vue 组件测试
 * @see modules/lms/components/ueditor/render/nodes/bullet-list.vue
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

describe('ueditor/render/nodes/bullet-list.vue', () => {
  it('renders a <ul> with default disc list-style', async () => {
    const { default: BulletList } = await import('../../../../../components/ueditor/render/nodes/bullet-list.vue')
    const wrapper = mount(BulletList, {
      props: { node: { type: 'bulletList', attrs: {}, content: [{ type: 'listItem', content: [{ type: 'text', text: 'Item 1' }] }] } },
      global: _globalConfig,
    })
    expect(wrapper.find('ul').exists()).toBe(true)
    expect(wrapper.find('ul').attributes('data-type')).toBe('disc')
    expect(wrapper.html()).toContain('Item 1')
  })

  it('uses custom listType from attrs', async () => {
    const { default: BulletList } = await import('../../../../../components/ueditor/render/nodes/bullet-list.vue')
    const wrapper = mount(BulletList, {
      props: { node: { type: 'bulletList', attrs: { listType: 'circle' }, content: [] } },
      global: _globalConfig,
    })
    expect(wrapper.find('ul').attributes('data-type')).toBe('circle')
  })
})
