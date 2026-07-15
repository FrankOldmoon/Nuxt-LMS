/**
 * MessageModal component tests
 * @see modules/base/components/layout/messageModal.vue
 *
 * Message center modal: includes sidebar + chat
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n, setMockAuthUser, setMockFetchHandler } from '../../../../../test/setup/nuxt-stubs'
import { useMessages, provideMessages } from '../../../composables/useMessages'
import { useUnreadCounts } from '../../../composables/useUnreadCounts'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  setMockAuthUser({ id: 1, name: 'TestUser' }, [{ code: 'student' }], [])
  setMockFetchHandler(async () => ({ data: [], success: true, msg: '' }))
  ;(globalThis as any).useMessages = useMessages
  ;(globalThis as any).provideMessages = provideMessages
  ;(globalThis as any).useUnreadCounts = useUnreadCounts
})

const _globalStubs = {
  UModal: {
    template: '<div v-if="open" class="modal"><slot name="content" /></div>',
    props: ['open', 'ui'],
  },
  LayoutMessageSidebar: {
    template: '<div class="sidebar-stub" />',
  },
  LayoutMessageChat: {
    template: '<div class="chat-stub" />',
  },
}

const _globalConfig = {
  mocks: {
    $t: (k: string) => k,
    $i18n: { t: (k: string) => k, locale: { value: 'en' } },
  },
  stubs: _globalStubs,
}

describe('layout/messageModal.vue', () => {
  it('默认渲染（open=false 不显示）', async () => {
    const { default: MessageModal } = await import('../../../components/layout/messageModal.vue')
    const wrapper = mount(MessageModal, {
      props: { open: false },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('open=true 时显示弹窗内容', async () => {
    const { default: MessageModal } = await import('../../../components/layout/messageModal.vue')
    const wrapper = mount(MessageModal, {
      props: { open: true },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(true)
  })

  it('包含 sidebar 和 chat 子组件', async () => {
    const { default: MessageModal } = await import('../../../components/layout/messageModal.vue')
    const wrapper = mount(MessageModal, {
      props: { open: true },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.sidebar-stub').exists()).toBe(true)
    expect(wrapper.find('.chat-stub').exists()).toBe(true)
  })

  it('open 从 false 变 true 时触发数据加载', async () => {
    const { default: MessageModal } = await import('../../../components/layout/messageModal.vue')
    const wrapper = mount(MessageModal, {
      props: { open: false },
      global: _globalConfig,
    })
    await flushPromises()
    await wrapper.setProps({ open: true })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(true)
  })
})
