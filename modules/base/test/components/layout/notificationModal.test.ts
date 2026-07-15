/**
 * NotificationModal component tests
 * @see modules/base/components/layout/notificationModal.vue
 *
 * Notification modal: paginated loading + list + empty state
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n, setMockFetchHandler } from '../../../../../test/setup/nuxt-stubs'
import { useNotifications } from '../../../composables/useNotifications'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  ;(globalThis as any).useNotifications = useNotifications
})

const _globalStubs = {
  UModal: {
    template: '<div v-if="open" class="modal"><slot name="content" /></div>',
    props: ['open', 'ui'],
  },
  UIcon: { template: '<span class="icon" />', props: ['name'] },
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
})
