/**
 * course/announcementsModal/index.vue component test
 * @see modules/lms/components/course/announcementsModal/index.vue
 *
 * Announcement modal: UModal container, internally useCourseAnnouncements provides context
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

// stub useCourseAnnouncements + provideAnnouncements
beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  ;(globalThis as any).useCourseAnnouncements = () => ({
    pending: ref(false),
    creating: ref(false),
    showCreateForm: ref(false),
    announcements: ref([]),
    classes: ref([]),
    form: ref({ name: '', contentText: '', classIds: [] }),
    classMap: ref(new Map()),
    canCreate: ref(false),
    formatTime: (v: any) => String(v),
    renderContent: (c: any) => String(c),
    deleteAnnouncement: vi.fn(),
    toggleClass: vi.fn(),
    toggleCreateForm: vi.fn(),
    createAnnouncement: vi.fn(),
  })
  ;(globalThis as any).provideAnnouncements = () => {}
})

const _globalStubs = {
  UModal: {
    template: '<div v-if="open" class="modal"><slot name="content" /></div>',
    props: ['open', 'ui'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('course/announcementsModal/index.vue', () => {
  it('open=true 时渲染弹窗', async () => {
    const { default: AnnouncementsModal } = await import('../../../../components/course/announcementsModal/index.vue')
    const wrapper = mount(AnnouncementsModal, {
      props: { open: true, courseId: '1' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(true)
  })

  it('open=false 时不渲染弹窗', async () => {
    const { default: AnnouncementsModal } = await import('../../../../components/course/announcementsModal/index.vue')
    const wrapper = mount(AnnouncementsModal, {
      props: { open: false, courseId: '1' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('渲染标题', async () => {
    const { default: AnnouncementsModal } = await import('../../../../components/course/announcementsModal/index.vue')
    const wrapper = mount(AnnouncementsModal, {
      props: { open: true, courseId: '1' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('announcement.title')
  })

  it('正确接收 courseId prop', async () => {
    const { default: AnnouncementsModal } = await import('../../../../components/course/announcementsModal/index.vue')
    const wrapper = mount(AnnouncementsModal, {
      props: { open: true, courseId: 42 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('courseId')).toBe(42)
  })

  it('courseId 默认值为空字符串', async () => {
    const { default: AnnouncementsModal } = await import('../../../../components/course/announcementsModal/index.vue')
    const wrapper = mount(AnnouncementsModal, {
      props: { open: false },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('courseId')).toBe('')
  })
})
