/**
 * ueditor/render/nodes/blockquote.vue 组件测试
 * @see modules/lms/components/ueditor/render/nodes/blockquote.vue
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

describe('ueditor/render/nodes/blockquote.vue', () => {
  it('renders a <blockquote> with content', async () => {
    const { default: Blockquote } = await import('../../../../../components/ueditor/render/nodes/blockquote.vue')
    const wrapper = mount(Blockquote, {
      props: { node: { type: 'blockquote', content: [{ type: 'text', text: 'Quoted text' }] } },
      global: _globalConfig,
    })
    expect(wrapper.find('blockquote').exists()).toBe(true)
    expect(wrapper.html()).toContain('Quoted text')
  })

  it('renders empty blockquote when content is empty', async () => {
    const { default: Blockquote } = await import('../../../../../components/ueditor/render/nodes/blockquote.vue')
    const wrapper = mount(Blockquote, {
      props: { node: { type: 'blockquote', content: [] } },
      global: _globalConfig,
    })
    expect(wrapper.find('blockquote').exists()).toBe(true)
  })
})
