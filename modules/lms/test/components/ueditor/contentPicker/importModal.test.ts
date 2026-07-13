// ueditor/contentPicker/importModal.vue component tests
// @see modules/lms/components/ueditor/contentPicker/importModal.vue
//
// Import modal: Monaco JSON editor for bulk import, question format help.
// Uses useContentPickerContext for state.
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'
import { ContentPickerKey } from '../../../../components/ueditor/contentPicker/useContentPicker'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

function makeMockCtx(overrides: Record<string, any> = {}) {
  return {
    t: (k: string) => k,
    importOpen: ref(false),
    importJson: ref(''),
    importing: ref(false),
    importMsg: ref(''),
    importOk: ref(false),
    doImport: async () => {},
    copyPrompt: () => {},
    currentType: ref('question'),
    ...overrides,
  }
}

const _globalConfig = {
  mocks: { $t: (k: string) => k, $i18n: { t: (k: string) => k, locale: { value: 'en' } } },
  stubs: {
    UModal: { template: '<div><slot name="body" /><slot name="content" /><slot /></div>' },
    UButton: { template: '<button><slot /></button>' },
    Monaco: true,
  },
}

describe('ueditor/contentPicker/importModal.vue', () => {
  it('mounts without error with valid context', async () => {
    const { default: ImportModal } = await import('../../../../components/ueditor/contentPicker/importModal.vue')
    const wrapper = mount(ImportModal, {
      global: { ..._globalConfig, provide: { [ContentPickerKey]: makeMockCtx() } },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('renders import title text', async () => {
    const { default: ImportModal } = await import('../../../../components/ueditor/contentPicker/importModal.vue')
    const wrapper = mount(ImportModal, {
      global: { ..._globalConfig, provide: { [ContentPickerKey]: makeMockCtx() } },
    })
    expect(wrapper.html()).toContain('courseData.importTitle')
  })

  it('renders error message when importMsg is set and importOk is false', async () => {
    const { default: ImportModal } = await import('../../../../components/ueditor/contentPicker/importModal.vue')
    const wrapper = mount(ImportModal, {
      global: { ..._globalConfig, provide: { [ContentPickerKey]: makeMockCtx({ importMsg: ref('Invalid JSON'), importOk: ref(false) }) } },
    })
    expect(wrapper.html()).toContain('Invalid JSON')
  })

  it('renders success message when importMsg is set and importOk is true', async () => {
    const { default: ImportModal } = await import('../../../../components/ueditor/contentPicker/importModal.vue')
    const wrapper = mount(ImportModal, {
      global: { ..._globalConfig, provide: { [ContentPickerKey]: makeMockCtx({ importMsg: ref('Imported 3 items'), importOk: ref(true) }) } },
    })
    expect(wrapper.html()).toContain('Imported 3 items')
  })
})
