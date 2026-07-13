// ueditor/cinserts.vue component tests
// @see modules/lms/components/ueditor/cinserts.vue
//
// Insert menu dropdown: provides Markdown/HTML insert + content picker triggers.
// Uses useCinserts composable for menu items and modal state.
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalConfig = {
  mocks: { $t: (k: string) => k, $i18n: { t: (k: string) => k, locale: { value: 'en' } } },
  stubs: {
    UDropdownMenu: { template: '<div><slot /></div>' },
    UIcon: true,
    UeditorInsertMarkdown: true,
    UeditorInsertHtml: true,
    UeditorContentPicker: true,
  },
}

describe('ueditor/cinserts.vue', () => {
  it('mounts without error with a null editor', async () => {
    const { default: Cinserts } = await import('../../../components/ueditor/cinserts.vue')
    const wrapper = mount(Cinserts, {
      props: { editor: null },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('renders the insert button with label', async () => {
    const { default: Cinserts } = await import('../../../components/ueditor/cinserts.vue')
    const wrapper = mount(Cinserts, {
      props: { editor: null },
      global: _globalConfig,
    })
    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.text()).toContain('courseData.insert')
  })

  it('renders child modal components (stubbed)', async () => {
    const { default: Cinserts } = await import('../../../components/ueditor/cinserts.vue')
    const wrapper = mount(Cinserts, {
      props: { editor: null },
      global: _globalConfig,
    })
    // Stubbed child components should be present in the component tree
    expect(wrapper.findComponent({ name: 'UeditorInsertMarkdown' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'UeditorInsertHtml' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'UeditorContentPicker' }).exists()).toBe(true)
  })
})
