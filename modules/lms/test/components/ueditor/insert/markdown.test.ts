// ueditor/insert/markdown.vue component tests
// @see modules/lms/components/ueditor/insert/markdown.vue
//
// Markdown insert modal: Monaco editor for markdown, converts to TipTap JSON and inserts.
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
    UModal: { template: '<div><slot name="body" /><slot name="content" /><slot /></div>' },
    UButton: { template: '<button><slot /></button>' },
    Monaco: true,
  },
}

describe('ueditor/insert/markdown.vue', () => {
  it('mounts without error with default open=false', async () => {
    const { default: MarkdownInsert } = await import('../../../../components/ueditor/insert/markdown.vue')
    const wrapper = mount(MarkdownInsert, {
      props: { open: false },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('mounts with an editor object prop', async () => {
    const { default: MarkdownInsert } = await import('../../../../components/ueditor/insert/markdown.vue')
    const wrapper = mount(MarkdownInsert, {
      props: {
        open: false,
        editor: { useEditor: () => ({ markdown: { parse: () => ({ type: 'doc' }) } }), insertContent: () => {} },
      },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('renders title text via $t mock when open', async () => {
    const { default: MarkdownInsert } = await import('../../../../components/ueditor/insert/markdown.vue')
    const wrapper = mount(MarkdownInsert, {
      props: { open: true },
      global: _globalConfig,
    })
    expect(wrapper.html()).toContain('ueditor.markdown.title')
  })
})
