/**
 * NotificationModal 组件测试
 * @see modules/base/components/layout/notificationModal.vue
 *
 * 通知弹窗：分页加载 + 列表 + 空状态
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n, setMockFetchHandler } from '../../../../../test/setup/nuxt-stubs'
import { useNotifications } from '../../../composables/useNotifications'
import { useUnreadCounts } from '../../../composables/useUnreadCounts'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  ;(globalThis as any).useNotifications = useNotifications
  // 组件里还用了 useUnreadCounts（广播发送后刷新未读角标），auto-import 需要显式暴露
  ;(globalThis as any).useUnreadCounts = useUnreadCounts
})

const _globalStubs = {
  UModal: {
    template: '<div v-if="open" class="modal"><slot name="content" /></div>',
    props: ['open', 'ui'],
  },
  UIcon: { template: '<span class="icon" />', props: ['name'] },
  UTooltip: { template: '<span class="tooltip"><slot /></span>', props: ['text'] },
  UButton: {
    template: '<button @click="$emit(\'click\', $event)"><slot />{{ label }}</button>',
    props: ['variant', 'size', 'icon', 'disabled', 'label', 'color'],
    emits: ['click'],
  },
}

const _globalConfig = {
  mocks: {
    $t: (k: string) => k,
    $i18n: { t: (k: string) => k, locale: { value: 'en' } },
  },
  stubs: _globalStubs,
}

describe('layout/notificationModal.vue', () => {
  it('默认渲染（open=false 不显示）', async () => {
    const { default: NotificationModal } = await import('../../../components/layout/notificationModal.vue')
    const wrapper = mount(NotificationModal, {
      props: { open: false },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('open=true 时显示弹窗标题', async () => {
    const { default: NotificationModal } = await import('../../../components/layout/notificationModal.vue')
    const wrapper = mount(NotificationModal, {
      props: { open: true },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(true)
    expect(wrapper.text()).toContain('notification.title')
  })

  it('无通知时显示空状态', async () => {
    setMockFetchHandler(async () => ({ data: { items: [], total: 0, page: 1, pageSize: 10 }, success: true, msg: '' }))
    const { default: NotificationModal } = await import('../../../components/layout/notificationModal.vue')
    const wrapper = mount(NotificationModal, {
      props: { open: true },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('notification.noNotifications')
  })

  it('有通知时渲染列表项', async () => {
    setMockFetchHandler(async () => ({
      data: {
        items: [
          { id: 1, name: '测试通知', content: { text: '通知内容' }, readAt: null, createdAt: '2026-01-01T00:00:00Z' },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      },
      success: true,
      msg: '',
    }))
    const { default: NotificationModal } = await import('../../../components/layout/notificationModal.vue')
    const wrapper = mount(NotificationModal, {
      props: { open: true },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('测试通知')
    expect(wrapper.text()).toContain('通知内容')
  })

  it('未读通知显示 unread 标签', async () => {
    setMockFetchHandler(async () => ({
      data: {
        items: [
          { id: 1, name: '未读通知', content: { text: '内容' }, readAt: null, createdAt: '2026-01-01T00:00:00Z' },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      },
      success: true,
      msg: '',
    }))
    const { default: NotificationModal } = await import('../../../components/layout/notificationModal.vue')
    const wrapper = mount(NotificationModal, {
      props: { open: true },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('notification.unread')
  })

  it('作业评分通知显示跳转按钮；无 CourseTaskModal 时回退跳转章节', async () => {
    setMockFetchHandler(async () => ({
      data: {
        items: [
          {
            id: 2, name: '作业已评分', content: null, readAt: null, createdAt: '2026-01-01T00:00:00Z',
            data: { type: 'homeworkGraded', score: 88, courseId: 1, homeworkCid: 5 },
          },
        ],
        total: 1, page: 1, pageSize: 10,
      },
      success: true,
      msg: '',
    }))
    const original = (globalThis as any).navigateTo
    const nav = vi.fn()
    ;(globalThis as any).navigateTo = nav
    try {
      const { default: NotificationModal } = await import('../../../components/layout/notificationModal.vue')
      const wrapper = mount(NotificationModal, { props: { open: true }, global: _globalConfig })
      await flushPromises()
      const btn = wrapper.find('.notif-action')
      expect(btn.exists()).toBe(true)
      await btn.trigger('click')
      await flushPromises()
      expect(nav).toHaveBeenCalledWith('/course/1/5')
      expect(wrapper.find('.modal').exists()).toBe(false) // 关闭通知弹窗
    } finally {
      ;(globalThis as any).navigateTo = original
    }
  })

  it('存在 CourseTaskModal 时，点击直接弹出 Task 详情（不跳转）', async () => {
    setMockFetchHandler(async () => ({
      data: {
        items: [
          {
            id: 2, name: '作业已评分', content: null, readAt: null, createdAt: '2026-01-01T00:00:00Z',
            data: { type: 'homeworkGraded', score: 88, courseId: 1, homeworkCid: 5 },
          },
        ],
        total: 1, page: 1, pageSize: 10,
      },
      success: true,
      msg: '',
    }))
    const original = (globalThis as any).navigateTo
    const nav = vi.fn()
    ;(globalThis as any).navigateTo = nav
    const CourseTaskModal = {
      template: '<div v-if="open" class="task-modal" :data-type="type" :data-id="id" :data-course="courseId" />',
      props: ['open', 'courseId', 'type', 'id'],
    }
    try {
      const { default: NotificationModal } = await import('../../../components/layout/notificationModal.vue')
      const wrapper = mount(NotificationModal, {
        props: { open: true },
        global: { ..._globalConfig, components: { CourseTaskModal } },
      })
      await flushPromises()
      await wrapper.find('.notif-action').trigger('click')
      await flushPromises()
      expect(nav).not.toHaveBeenCalled()
      const tm = wrapper.find('.task-modal')
      expect(tm.exists()).toBe(true)
      expect(tm.attributes('data-type')).toBe('homework')
      expect(tm.attributes('data-id')).toBe('5')
      expect(tm.attributes('data-course')).toBe('1')
    } finally {
      ;(globalThis as any).navigateTo = original
    }
  })

  it('评论过审通知显示跳转按钮', async () => {
    setMockFetchHandler(async () => ({
      data: {
        items: [
          {
            id: 3, name: '评论已通过审核', content: null, readAt: null, createdAt: '2026-01-01T00:00:00Z',
            data: { type: 'commentApproved', courseId: 7, cid: 9 },
          },
        ],
        total: 1, page: 1, pageSize: 10,
      },
      success: true,
      msg: '',
    }))
    const { default: NotificationModal } = await import('../../../components/layout/notificationModal.vue')
    const wrapper = mount(NotificationModal, { props: { open: true }, global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.notif-action').exists()).toBe(true)
  })

  it('普通广播通知不显示跳转按钮', async () => {
    setMockFetchHandler(async () => ({
      data: {
        items: [
          { id: 4, name: '系统公告', content: { text: '正文' }, readAt: null, createdAt: '2026-01-01T00:00:00Z', data: { type: 'broadcast' } },
        ],
        total: 1, page: 1, pageSize: 10,
      },
      success: true,
      msg: '',
    }))
    const { default: NotificationModal } = await import('../../../components/layout/notificationModal.vue')
    const wrapper = mount(NotificationModal, { props: { open: true }, global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.notif-action').exists()).toBe(false)
  })
})
