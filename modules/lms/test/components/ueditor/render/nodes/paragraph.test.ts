/**
 * ueditor/render/nodes/paragraph.vue 组件测试
 * @see modules/lms/components/ueditor/render/nodes/paragraph.vue
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

describe('ueditor/render/nodes/paragraph.vue', () => {
  it('renders a <p> with text content', async () => {
    const { default: Paragraph } = await import('../../../../../components/ueditor/render/nodes/paragraph.vue')
    const wrapper = mount(Paragraph, {
      props: {
        node: {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello world' }],
        },
      },
      global: _globalConfig,
    })
    expect(wrapper.find('p').exists()).toBe(true)
    expect(wrapper.html()).toContain('Hello world')
  })

  it('renders <br> when content is empty', async () => {
    const { default: Paragraph } = await import('../../../../../components/ueditor/render/nodes/paragraph.vue')
    const wrapper = mount(Paragraph, {
      props: { node: { type: 'paragraph', content: [] } },
      global: _globalConfig,
    })
    expect(wrapper.find('br').exists()).toBe(true)
  })

  it('applies lineHeight style from attrs', async () => {
    const { default: Paragraph } = await import('../../../../../components/ueditor/render/nodes/paragraph.vue')
    const wrapper = mount(Paragraph, {
      props: {
        node: {
          type: 'paragraph',
          attrs: { lineHeight: 2.0 },
          content: [{ type: 'text', text: 'Styled' }],
        },
      },
      global: _globalConfig,
    })
    expect(wrapper.html()).toContain('line-height: 2')
  })
})
