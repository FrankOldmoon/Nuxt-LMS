// ueditor/contentPicker/header.vue component tests
// @see modules/lms/components/ueditor/contentPicker/header.vue
//
// Content picker header: title, search, add/import/export buttons, selected tags.
// Uses useContentPickerContext (inject) for state.
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
    open: ref(false),
    title: ref('Test Title'),
    previewMode: ref(false),
    selected: ref<number[]>([]),
    filterType: ref('question'),
    typeOptions: ref([{ label: 'Question', value: 'question' }]),
    keyword: ref(''),
    addNew: () => {},
    importOpen: ref(false),
    exportItems: () => {},
    filtered: ref([]),
    toggle: (_cid: number) => {},
    ...overrides,
  }
}

const _globalConfig = {
  mocks: { $t: (k: string) => k, $i18n: { t: (k: string) => k, locale: { value: 'en' } } },
  stubs: {
    UButton: { template: '<button><slot /></button>' },
    UInput: { template: '<input />' },
    USelect: { template: '<select><slot /></select>' },
    UBadge: { template: '<span><slot /></span>' },
    UIcon: true,
  },
}

describe('ueditor/contentPicker/header.vue', () => {
  it('mounts without error with valid context', async () => {
    const { default: Header } = await import('../../../../components/ueditor/contentPicker/header.vue')
    const wrapper = mount(Header, {
      global: { ..._globalConfig, provide: { [ContentPickerKey]: makeMockCtx() } },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('renders the title from context', async () => {
    const { default: Header } = await import('../../../../components/ueditor/contentPicker/header.vue')
    const wrapper = mount(Header, {
      global: { ..._globalConfig, provide: { [ContentPickerKey]: makeMockCtx({ title: ref('My Picker') }) } },
    })
    expect(wrapper.html()).toContain('My Picker')
  })

  it('renders selected badges when items are selected (non-preview mode)', async () => {
    const { default: Header } = await import('../../../../components/ueditor/contentPicker/header.vue')
    const wrapper = mount(Header, {
      global: { ..._globalConfig, provide: { [ContentPickerKey]: makeMockCtx({ selected: ref([1, 2]) }) } },
    })
    expect(wrapper.html()).toContain('#1')
    expect(wrapper.html()).toContain('#2')
  })

  it('renders type filter select in preview mode', async () => {
    const { default: Header } = await import('../../../../components/ueditor/contentPicker/header.vue')
    const wrapper = mount(Header, {
      global: { ..._globalConfig, provide: { [ContentPickerKey]: makeMockCtx({ previewMode: ref(true) }) } },
    })
    expect(wrapper.html()).toContain('courseData.searchPlaceholder')
  })
})
