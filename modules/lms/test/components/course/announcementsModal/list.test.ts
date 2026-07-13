/**
 * course/announcementsModal/list.vue 组件测试
 * @see modules/lms/components/course/announcementsModal/list.vue
 *
 * 公告列表：pending / empty / 列表渲染 + canCreate 控制删除按钮
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UButton: {
    template: '<button class="ubutton" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['icon', 'color', 'variant', 'size'],
  },
  UBadge: {
    template: '<span class="ubadge">{{ label }}<slot /></span>',
    props: ['label', 'color', 'variant', 'size'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string, params?: any) => {
    if (params) {
      let s = k
      for (const [kk, v] of Object.entries(params)) s = s.replace(`{${kk}}`, String(v))
      return s
    }
    return k
  } },
  stubs: _globalStubs,
}

function setupContext(overrides: any = {}) {
  const ctx = {
    pending: ref(false),
    announcements: ref([]),
    classMap: ref(new Map()),
    canCreate: ref(false),
    formatTime: (v: any) => String(v),
    renderContent: (c: any) => String(c),
    deleteAnnouncement: vi.fn(),
    ...overrides,
  }
  ;(globalThis as any).useAnnouncementsContext = () => ctx
  return ctx
}

describe('course/announcementsModal/list.vue', () => {
  it('pending=true 时显示加载中', async () => {
    setupContext({ pending: ref(true) })
    const { default: List } = await import('../../../../components/course/announcementsModal/list.vue')
    const wrapper = mount(List, { global: _globalConfig })
    expect(wrapper.text()).toContain('common.loading')
  })

  it('无公告时显示空提示', async () => {
    setupContext({ pending: ref(false), announcements: ref([]) })
    const { default: List } = await import('../../../../components/course/announcementsModal/list.vue')
    const wrapper = mount(List, { global: _globalConfig })
    expect(wrapper.text()).toContain('announcement.empty')
  })

  it('渲染公告列表', async () => {
    setupContext({
      pending: ref(false),
      announcements: ref([
        { id: 1, name: '公告1', content: '内容1', createdAt: '2024-01-01', classId: 0 },
        { id: 2, name: '公告2', content: '内容2', createdAt: '2024-01-02', classId: 1 },
      ]),
    })
    const { default: List } = await import('../../../../components/course/announcementsModal/list.vue')
    const wrapper = mount(List, { global: _globalConfig })
    expect(wrapper.text()).toContain('公告1')
    expect(wrapper.text()).toContain('公告2')
  })

  it('canCreate=true 时显示删除按钮', async () => {
    setupContext({
      pending: ref(false),
      announcements: ref([{ id: 1, name: '公告1', content: '', createdAt: '', classId: 0 }]),
      canCreate: ref(true),
    })
    const { default: List } = await import('../../../../components/course/announcementsModal/list.vue')
    const wrapper = mount(List, { global: _globalConfig })
    expect(wrapper.find('.ubutton').exists()).toBe(true)
  })

  it('canCreate=false 时不显示删除按钮', async () => {
    setupContext({
      pending: ref(false),
      announcements: ref([{ id: 1, name: '公告1', content: '', createdAt: '', classId: 0 }]),
      canCreate: ref(false),
    })
    const { default: List } = await import('../../../../components/course/announcementsModal/list.vue')
    const wrapper = mount(List, { global: _globalConfig })
    expect(wrapper.find('.ubutton').exists()).toBe(false)
  })

  it('点击删除按钮调用 deleteAnnouncement', async () => {
    const deleteMock = vi.fn()
    setupContext({
      pending: ref(false),
      announcements: ref([{ id: 5, name: '公告', content: '', createdAt: '', classId: 0 }]),
      canCreate: ref(true),
      deleteAnnouncement: deleteMock,
    })
    const { default: List } = await import('../../../../components/course/announcementsModal/list.vue')
    const wrapper = mount(List, { global: _globalConfig })
    await wrapper.find('.ubutton').trigger('click')
    expect(deleteMock).toHaveBeenCalledWith(5)
  })

  it('classId 存在时显示班级 badge', async () => {
    setupContext({
      pending: ref(false),
      announcements: ref([{ id: 1, name: '公告', content: '', createdAt: '', classId: 3 }]),
      classMap: ref(new Map([[3, { id: 3, name: '三班' }]])),
    })
    const { default: List } = await import('../../../../components/course/announcementsModal/list.vue')
    const wrapper = mount(List, { global: _globalConfig })
    expect(wrapper.text()).toContain('三班')
  })

  it('classId=0 时显示全班级 badge', async () => {
    setupContext({
      pending: ref(false),
      announcements: ref([{ id: 1, name: '公告', content: '', createdAt: '', classId: 0 }]),
    })
    const { default: List } = await import('../../../../components/course/announcementsModal/list.vue')
    const wrapper = mount(List, { global: _globalConfig })
    expect(wrapper.text()).toContain('announcement.allClasses')
  })
})
