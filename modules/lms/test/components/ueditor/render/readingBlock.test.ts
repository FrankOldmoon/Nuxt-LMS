// ueditor/render/readingBlock.vue component tests
// @see modules/lms/components/ueditor/render/readingBlock.vue
//
// 视觉反馈契约（所有 node 一律用 box-shadow 边框，不区分文字/非文字）：
// - 默认（未 hover、未读）：无边框类
// - hover 进入：reading-hover-border（黄色），heading 已完成时不显示
// - 已读（3s hover 后）：reading-visited-border（绿色，持久）
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalConfig = {
  mocks: { $t: (k: string) => k, $i18n: { t: (k: string) => k, locale: { value: 'en' } } },
  stubs: {},
}

describe('ueditor/render/readingBlock.vue', () => {
  it('renders a div wrapper with slot content', async () => {
    const { default: ReadingBlock } = await import('../../../../components/ueditor/render/readingBlock.vue')
    const wrapper = mount(ReadingBlock, {
      props: {
        node: { type: 'paragraph', content: [{ type: 'text', text: 'Block content' }] },
        blockKey: '1',
      },
      slots: { default: '<span>Slotted</span>' },
      global: _globalConfig,
    })
    expect(wrapper.find('div').exists()).toBe(true)
    expect(wrapper.html()).toContain('Slotted')
  })

  it('does not apply any border class by default (no hover, not read)', async () => {
    const { default: ReadingBlock } = await import('../../../../components/ueditor/render/readingBlock.vue')
    const wrapper = mount(ReadingBlock, {
      props: {
        node: { type: 'paragraph' },
        blockKey: '2',
      },
      slots: { default: '<p>text</p>' },
      global: _globalConfig,
    })
    const cls = wrapper.find('div').classes()
    expect(cls).not.toContain('reading-hover-border')
    expect(cls).not.toContain('reading-visited-border')
  })

  it('applies reading-hover-border (yellow) on mouseenter', async () => {
    const { default: ReadingBlock } = await import('../../../../components/ueditor/render/readingBlock.vue')
    const wrapper = mount(ReadingBlock, {
      props: { node: { type: 'paragraph' }, blockKey: '2-hover' },
      slots: { default: '<p>text</p>' },
      global: _globalConfig,
    })
    await wrapper.find('div').trigger('mouseenter')
    expect(wrapper.find('div').classes()).toContain('reading-hover-border')
    expect(wrapper.find('div').classes()).not.toContain('reading-visited-border')
  })

  it('removes reading-hover-border on mouseleave', async () => {
    const { default: ReadingBlock } = await import('../../../../components/ueditor/render/readingBlock.vue')
    const wrapper = mount(ReadingBlock, {
      props: { node: { type: 'paragraph' }, blockKey: '2-leave' },
      slots: { default: '<p>text</p>' },
      global: _globalConfig,
    })
    await wrapper.find('div').trigger('mouseenter')
    await wrapper.find('div').trigger('mouseleave')
    const cls = wrapper.find('div').classes()
    expect(cls).not.toContain('reading-hover-border')
    expect(cls).not.toContain('reading-visited-border')
  })

  it('uses border (not background) for text-type nodes like paragraph', async () => {
    const { default: ReadingBlock } = await import('../../../../components/ueditor/render/readingBlock.vue')
    const wrapper = mount(ReadingBlock, {
      props: { node: { type: 'paragraph' }, blockKey: '2-text' },
      slots: { default: '<p>text</p>' },
      global: _globalConfig,
    })
    await wrapper.find('div').trigger('mouseenter')
    // 文字节点也用边框（不再用 background 区分）
    expect(wrapper.find('div').classes()).toContain('reading-hover-border')
    expect(wrapper.find('div').classes()).not.toContain('reading-visited-bg')
  })

  it('accepts text-type node (paragraph) without error', async () => {
    const { default: ReadingBlock } = await import('../../../../components/ueditor/render/readingBlock.vue')
    const wrapper = mount(ReadingBlock, {
      props: { node: { type: 'paragraph' }, blockKey: '3' },
      slots: { default: '<p>para</p>' },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('accepts non-text node (image) without error', async () => {
    const { default: ReadingBlock } = await import('../../../../components/ueditor/render/readingBlock.vue')
    const wrapper = mount(ReadingBlock, {
      props: { node: { type: 'image', attrs: { src: 'x.png' } }, blockKey: '4' },
      slots: { default: '<img src="x.png" />' },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
  })
})
