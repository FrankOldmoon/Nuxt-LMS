// ueditor/contentPicker/footer.vue component tests
// @see modules/lms/components/ueditor/contentPicker/footer.vue
//
// Content picker footer: pagination, confirm/cancel buttons (select mode),
// or prev/next + edit/delete (preview mode). Uses useContentPickerContext.
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
    previewMode: ref(false),
    filtered: ref([{ cid: 1, name: 'Item 1' }]),
    currentIndex: ref(0),
    prev: () => {},
    next: () => {},
    currentItem: ref({ cid: 1, name: 'Item 1' }),
    editCurrent: () => {},
    deleteCurrent: () => {},
    page: ref(1),
    pageSize: ref(10),
    pageSizeOptions: ref([{ label: '10', value: 10 }]),
    totalPages: ref(1),
    prevPage: () => {},
    nextPage: () => {},
    selected: ref<number[]>([]),
    confirm: () => {},
    ...overrides,
  }
}

const _globalConfig = {
  mocks: { $t: (k: string) => k, $i18n: { t: (k: string) => k, locale: { value: 'en' } } },
  stubs: {
    UButton: { template: '<button><slot /></button>' },
    USelect: { template: '<select><slot /></select>' },
    UPopover: { template: '<div><slot /><slot name="content" /></div>' },
    UIcon: true,
  },
}

describe('ueditor/contentPicker/footer.vue', () => {
  it('mounts without error with valid context (select mode)', async () => {
    const { default: Footer } = await import('../../../../components/ueditor/contentPicker/footer.vue')
    const wrapper = mount(Footer, {
      global: { ..._globalConfig, provide: { [ContentPickerKey]: makeMockCtx() } },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('renders confirm button in select mode when items exist', async () => {
    const { default: Footer } = await import('../../../../components/ueditor/contentPicker/footer.vue')
    const wrapper = mount(Footer, {
      global: { ..._globalConfig, provide: { [ContentPickerKey]: makeMockCtx({ selected: ref([1]) }) } },
    })
    expect(wrapper.html()).toContain('courseData.confirmInsert')
  })

  it('renders navigation in preview mode', async () => {
    const { default: Footer } = await import('../../../../components/ueditor/contentPicker/footer.vue')
    const wrapper = mount(Footer, {
      global: { ..._globalConfig, provide: { [ContentPickerKey]: makeMockCtx({ previewMode: ref(true) }) } },
    })
    expect(wrapper.html()).toContain('1 / 1')
  })

  it('renders empty state message when no filtered items', async () => {
    const { default: Footer } = await import('../../../../components/ueditor/contentPicker/footer.vue')
    const wrapper = mount(Footer, {
      global: { ..._globalConfig, provide: { [ContentPickerKey]: makeMockCtx({ filtered: ref([]) }) } },
    })
    // In select mode with no items, the pagination section is hidden
    expect(wrapper.html()).toContain('courseData.selected')
  })
})
