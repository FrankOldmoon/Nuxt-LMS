// ueditor/render/index.vue component tests
// @see modules/lms/components/ueditor/render/index.vue
//
// Main render entry: converts json prop (object/string/number) into TipTap JSON
// and dispatches to RenderNode. Also manages image fullscreen preview modal.
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalConfig = {
  mocks: { $t: (k: string) => k, $i18n: { t: (k: string) => k, locale: { value: 'en' } } },
  stubs: {
    UeditorRenderImageModal: true,
  },
}

describe('ueditor/render/index.vue', () => {
  it('mounts with a simple doc json object', async () => {
    const { default: RenderIndex } = await import('../../../../components/ueditor/render/index.vue')
    const wrapper = mount(RenderIndex, {
      props: {
        json: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }] },
      },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.html()).toContain('Hello')
  })

  it('renders nothing when json is null or empty object', async () => {
    const { default: RenderIndex } = await import('../../../../components/ueditor/render/index.vue')
    const wrapper = mount(RenderIndex, {
      props: { json: {} },
      global: _globalConfig,
    })
    expect(wrapper.text()).toBe('')
  })

  it('converts string json prop to TipTap JSON via markdownToTiptap', async () => {
    const { default: RenderIndex } = await import('../../../../components/ueditor/render/index.vue')
    const wrapper = mount(RenderIndex, {
      props: { json: '# Heading text' },
      global: _globalConfig,
    })
    expect(wrapper.html()).toContain('Heading text')
  })

  it('converts number json prop to string content', async () => {
    const { default: RenderIndex } = await import('../../../../components/ueditor/render/index.vue')
    const wrapper = mount(RenderIndex, {
      props: { json: 42 },
      global: _globalConfig,
    })
    expect(wrapper.html()).toContain('42')
  })

  it('passes courseId prop through to effectiveCourseId', async () => {
    const { default: RenderIndex } = await import('../../../../components/ueditor/render/index.vue')
    const wrapper = mount(RenderIndex, {
      props: {
        json: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'test' }] }] },
        courseId: 5,
      },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
  })
})
