// ueditor/contentPicker/previewArea.vue component tests
// @see modules/lms/components/ueditor/contentPicker/previewArea.vue
//
// Content picker preview area: loading state, preview mode (single item),
// or select mode (paginated list with checkboxes). Uses useContentPickerContext.
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
    loading: ref(false),
    previewMode: ref(false),
    filtered: ref([{ cid: 1, name: 'Item 1' }]),
    currentItem: ref({ cid: 1, name: 'Item 1' }),
    renderNode: ref({ type: 'doc', content: [] }),
    renderComp: { name: 'StubRender' },
    pagedItems: ref([{ cid: 1, name: 'Item 1' }]),
    isSelected: (_cid: number) => false,
    toggle: (_cid: number) => {},
    editItem: (_item: any) => {},
    deleteItem: (_item: any) => {},
    singularType: ref('question'),
    ...overrides,
  }
}

const _globalConfig = {
  mocks: { $t: (k: string) => k, $i18n: { t: (k: string) => k, locale: { value: 'en' } } },
  stubs: {
    UButton: { template: '<button><slot /></button>' },
    UPopover: { template: '<div><slot /><slot name="content" /></div>' },
    UIcon: true,
  },
}

describe('ueditor/contentPicker/previewArea.vue', () => {
  it('mounts without error with valid context (select mode)', async () => {
    const { default: PreviewArea } = await import('../../../../components/ueditor/contentPicker/previewArea.vue')
    const wrapper = mount(PreviewArea, {
      global: { ..._globalConfig, provide: { [ContentPickerKey]: makeMockCtx() } },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('renders loading spinner when loading is true', async () => {
    const { default: PreviewArea } = await import('../../../../components/ueditor/contentPicker/previewArea.vue')
    const wrapper = mount(PreviewArea, {
      global: { ..._globalConfig, provide: { [ContentPickerKey]: makeMockCtx({ loading: ref(true) }) } },
    })
    expect(wrapper.html()).toContain('common.loading')
  })

  it('renders empty state message when no items', async () => {
    const { default: PreviewArea } = await import('../../../../components/ueditor/contentPicker/previewArea.vue')
    const wrapper = mount(PreviewArea, {
      global: { ..._globalConfig, provide: { [ContentPickerKey]: makeMockCtx({ pagedItems: ref([]), filtered: ref([]) }) } },
    })
    expect(wrapper.html()).toContain('courseData.empty')
  })

  it('renders item name in select mode', async () => {
    const { default: PreviewArea } = await import('../../../../components/ueditor/contentPicker/previewArea.vue')
    const wrapper = mount(PreviewArea, {
      global: { ..._globalConfig, provide: { [ContentPickerKey]: makeMockCtx({ pagedItems: ref([{ cid: 5, name: 'My Question' }]) }) } },
    })
    expect(wrapper.html()).toContain('My Question')
    expect(wrapper.html()).toContain('#5')
  })
})
