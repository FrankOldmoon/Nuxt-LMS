// ueditor/index.vue component tests
// @see modules/lms/components/ueditor/index.vue
//
// UmoEditor wrapper: the main rich text editor component.
// Imports UmoEditor from @umoteam/editor (stubbed in tests).
// Basic mount test only — full editor behavior requires browser + CDN.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

// Stub @umoteam/editor to avoid loading the real editor (CDN/browser deps)
vi.mock('@umoteam/editor', () => ({
  UmoEditor: {
    name: 'UmoEditorStub',
    template: '<div class="umo-editor-stub"></div>',
  },
}))

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalConfig = {
  mocks: { $t: (k: string) => k, $i18n: { t: (k: string) => k, locale: { value: 'en' } } },
  stubs: {
    ClientOnly: false,
    Cinserts: true,
    UeditorWs: true,
    AiFloat: true,
  },
}

describe('ueditor/index.vue', () => {
  it('mounts without error with minimal props', async () => {
    const { default: UeditorIndex } = await import('../../../components/ueditor/index.vue')
    const wrapper = mount(UeditorIndex, {
      props: {},
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('mounts with lockId prop', async () => {
    const { default: UeditorIndex } = await import('../../../components/ueditor/index.vue')
    const wrapper = mount(UeditorIndex, {
      props: { lockId: 'lock-1' },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('exposes saveDocument method', async () => {
    const { default: UeditorIndex } = await import('../../../components/ueditor/index.vue')
    const wrapper = mount(UeditorIndex, {
      props: {},
      global: _globalConfig,
    })
    expect(typeof wrapper.vm.saveDocument).toBe('function')
  })
})
