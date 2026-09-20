// ueditor/render/node.vue component tests
// @see modules/lms/components/ueditor/render/node.vue
//
// Node dispatcher: routes by node.type to text/doc/registered component/fallback div.
// Recursive component (renders itself for child nodes).
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n, useState } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalConfig = {
  mocks: { $t: (k: string) => k, $i18n: { t: (k: string) => k, locale: { value: 'en' } } },
  stubs: {},
}

describe('ueditor/render/node.vue', () => {
  it('renders text node via TextRenderer', async () => {
    const { default: RenderNode } = await import('../../../../components/ueditor/render/node.vue')
    const wrapper = mount(RenderNode, {
      props: { node: { type: 'text', text: 'Simple text' } },
      global: _globalConfig,
    })
    expect(wrapper.html()).toContain('Simple text')
  })

  it('renders text node with marks (bold)', async () => {
    const { default: RenderNode } = await import('../../../../components/ueditor/render/node.vue')
    const wrapper = mount(RenderNode, {
      props: {
        node: { type: 'text', text: 'Bold text', marks: [{ type: 'bold' }] },
      },
      global: _globalConfig,
    })
    expect(wrapper.html()).toContain('Bold text')
    expect(wrapper.html()).toContain('<b')
  })

  it('renders doc node with child content recursively', async () => {
    const { default: RenderNode } = await import('../../../../components/ueditor/render/node.vue')
    const wrapper = mount(RenderNode, {
      props: {
        node: {
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'First' }] },
            { type: 'paragraph', content: [{ type: 'text', text: 'Second' }] },
          ],
        },
      },
      global: _globalConfig,
    })
    expect(wrapper.html()).toContain('First')
    expect(wrapper.html()).toContain('Second')
  })

  it('renders paragraph node as registered component', async () => {
    const { default: RenderNode } = await import('../../../../components/ueditor/render/node.vue')
    const wrapper = mount(RenderNode, {
      props: {
        node: { type: 'paragraph', content: [{ type: 'text', text: 'Para text' }] },
      },
      global: _globalConfig,
    })
    expect(wrapper.html()).toContain('Para text')
  })

  it('renders heading node with level attr', async () => {
    const { default: RenderNode } = await import('../../../../components/ueditor/render/node.vue')
    const wrapper = mount(RenderNode, {
      props: {
        node: { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Heading 2' }] },
      },
      global: _globalConfig,
    })
    expect(wrapper.html()).toContain('Heading 2')
    expect(wrapper.html()).toContain('<h2')
  })

  it('renders unknown node type in a fallback div with children', async () => {
    const { default: RenderNode } = await import('../../../../components/ueditor/render/node.vue')
    const wrapper = mount(RenderNode, {
      props: {
        node: { type: 'unknownType', content: [{ type: 'text', text: 'Fallback content' }] },
      },
      global: _globalConfig,
    })
    expect(wrapper.html()).toContain('Fallback content')
  })

  it('passes blockKeyPrefix prop for list types when trackReading is true', async () => {
    const { default: RenderNode } = await import('../../../../components/ueditor/render/node.vue')
    const wrapper = mount(RenderNode, {
      props: {
        node: {
          type: 'doc',
          content: [
            { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'text', text: 'item' }] }] },
          ],
        },
        trackReading: true,
      },
      global: _globalConfig,
    })
    expect(wrapper.html()).toContain('item')
  })

  it('does not group content into cards when not in play mode', async () => {
    const { default: RenderNode } = await import('../../../../components/ueditor/render/node.vue')
    const wrapper = mount(RenderNode, {
      props: {
        node: {
          type: 'doc',
          content: [
            { type: 'heading', attrs: { id: 'h1', level: 2 }, content: [{ type: 'text', text: 'Title' }] },
            { type: 'paragraph', content: [{ type: 'text', text: 'Body' }] },
          ],
        },
        trackReading: true,
      },
      global: _globalConfig,
    })
    expect(wrapper.findAll('.chapter-play-card')).toHaveLength(0)
    expect(wrapper.html()).toContain('Body')
  })

  it('groups each heading and its content into a knowledge card in play mode', async () => {
    const { default: RenderNode } = await import('../../../../components/ueditor/render/node.vue')
    useState<boolean>('chapter-play-fullscreen').value = true
    const wrapper = mount(RenderNode, {
      props: {
        node: {
          type: 'doc',
          content: [
            { type: 'heading', attrs: { id: 'h1', level: 2 }, content: [{ type: 'text', text: 'Title A' }] },
            { type: 'paragraph', content: [{ type: 'text', text: 'Body A' }] },
            { type: 'heading', attrs: { id: 'h2', level: 3 }, content: [{ type: 'text', text: 'Title B' }] },
            { type: 'paragraph', content: [{ type: 'text', text: 'Body B' }] },
          ],
        },
        trackReading: true,
      },
      global: _globalConfig,
    })
    const cards = wrapper.findAll('.chapter-play-card')
    expect(cards).toHaveLength(2)
    // 每个卡片包含各自的标题与正文
    expect(cards[0].html()).toContain('Title A')
    expect(cards[0].html()).toContain('Body A')
    expect(cards[0].html()).not.toContain('Body B')
    expect(cards[1].html()).toContain('Title B')
    expect(cards[1].html()).toContain('Body B')
  })
})
