/**
 * ueditor/render/nodes/tag.vue 组件测试
 * @see modules/lms/components/ueditor/render/nodes/tag.vue
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

describe('ueditor/render/nodes/tag.vue', () => {
  it('renders the tag text', async () => {
    const { default: Tag } = await import('../../../../../components/ueditor/render/nodes/tag.vue')
    const wrapper = mount(Tag, {
      props: { node: { type: 'tag', attrs: { text: 'Important', color: 'red', backgroundColor: 'yellow' } } },
      global: _globalConfig,
    })
    expect(wrapper.find('.umo-node-tag').exists()).toBe(true)
    expect(wrapper.text()).toContain('Important')
  })

  it('renders empty span when no text attr', async () => {
    const { default: Tag } = await import('../../../../../components/ueditor/render/nodes/tag.vue')
    const wrapper = mount(Tag, { props: { node: { type: 'tag', attrs: {} } }, global: _globalConfig })
    expect(wrapper.find('.umo-node-tag-text').exists()).toBe(true)
  })
})
