// ueditor/insert/html.vue component tests
// @see modules/lms/components/ueditor/insert/html.vue
//
// HTML insert modal: Monaco editor for raw HTML, inserts into TipTap editor.
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

describe('ueditor/insert/html.vue', () => {
  it('mounts without error with default open=false', async () => {
    const { default: HtmlInsert } = await import('../../../../components/ueditor/insert/html.vue')
    const wrapper = mount(HtmlInsert, {
      props: { open: false },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('mounts with an editor object prop', async () => {
    const { default: HtmlInsert } = await import('../../../../components/ueditor/insert/html.vue')
    const wrapper = mount(HtmlInsert, {
      props: { open: false, editor: { useEditor: () => ({ getHTML: () => '<p>test</p>' }) } },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('renders insert button text via $t mock', async () => {
    const { default: HtmlInsert } = await import('../../../../components/ueditor/insert/html.vue')
    const wrapper = mount(HtmlInsert, {
      props: { open: true },
      global: _globalConfig,
    })
    expect(wrapper.html()).toContain('ueditor.html.insert')
  })
})
