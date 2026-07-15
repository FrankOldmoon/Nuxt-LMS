/**
 * MessageSidebar component tests
 * @see modules/base/components/layout/messageSidebar.vue
 *
 * Message sidebar: search + conversation list
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'
import { provideMessages, useMessagesContext } from '../../../composables/useMessages'

// Expose to globalThis at module top level
;(globalThis as any).useMessagesContext = useMessagesContext

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  ;(globalThis as any).useMessagesContext = useMessagesContext
})

function setupMockContext(overrides: any = {}) {
  const ctx = {
    t: (k: string) => k,
    user: ref({ id: 1, name: 'Me' }),
    conversations: ref([]),
    selectedUserId: ref(0),
    selectedUser: ref(null),
    messages: ref([]),
    msgLoading: ref(false),
    inputText: ref(''),
    sending: ref(false),
    msgContainer: ref(null),
    searchKeyword: ref(''),
    searchResults: ref([]),
    onSearchInput: () => {},
    startConversation: () => {},
    selectConversation: () => {},
    loadMessages: () => {},
    sendMessage: () => {},
    formatMsgTime: (ts: string) => ts,
    ...overrides,
  }
  provideMessages(ctx)
  return ctx
}

const _globalStubs = {
  UAvatar: { template: '<div class="avatar" />', props: ['src', 'alt', 'text', 'size'] },
  UInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder', 'icon', 'size'],
    emits: ['update:modelValue'],
  },
}

const _globalConfig = {
  mocks: {
    $t: (k: string) => k,
    $i18n: { t: (k: string) => k, locale: { value: 'en' } },
  },
  stubs: _globalStubs,
}

describe('layout/messageSidebar.vue', () => {
  it('渲染标题和搜索框', async () => {
    setupMockContext()
    const { default: MessageSidebar } = await import('../../../components/layout/messageSidebar.vue')
    const wrapper = mount(MessageSidebar, { global: _globalConfig })
    expect(wrapper.text()).toContain('message.title')
    expect(wrapper.find('input').exists()).toBe(true)
  })

  it('无会话时显示空状态', async () => {
    setupMockContext({ conversations: ref([]) })
    const { default: MessageSidebar } = await import('../../../components/layout/messageSidebar.vue')
    const wrapper = mount(MessageSidebar, { global: _globalConfig })
    expect(wrapper.text()).toContain('message.noConversations')
  })

  it('有会话时渲染会话列表', async () => {
    setupMockContext({
      conversations: ref([
        { userId: 2, name: 'Alice', avatarImg: '', lastMessage: { text: '你好' }, unreadCount: 0 },
        { userId: 3, name: 'Bob', avatarImg: '', lastMessage: { text: '在吗' }, unreadCount: 2 },
      ]),
    })
    const { default: MessageSidebar } = await import('../../../components/layout/messageSidebar.vue')
    const wrapper = mount(MessageSidebar, { global: _globalConfig })
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('Bob')
    expect(wrapper.text()).toContain('你好')
  })

  it('未读数大于 0 时显示徽标', async () => {
    setupMockContext({
      conversations: ref([
        { userId: 2, name: 'Alice', avatarImg: '', lastMessage: { text: 'hi' }, unreadCount: 5 },
      ]),
    })
    const { default: MessageSidebar } = await import('../../../components/layout/messageSidebar.vue')
    const wrapper = mount(MessageSidebar, { global: _globalConfig })
    expect(wrapper.text()).toContain('5')
  })

  it('未读数大于 9 时显示 9+', async () => {
    setupMockContext({
      conversations: ref([
        { userId: 2, name: 'Alice', avatarImg: '', lastMessage: { text: 'hi' }, unreadCount: 15 },
      ]),
    })
    const { default: MessageSidebar } = await import('../../../components/layout/messageSidebar.vue')
    const wrapper = mount(MessageSidebar, { global: _globalConfig })
    expect(wrapper.text()).toContain('9+')
  })

  it('有搜索结果时渲染搜索结果列表', async () => {
    setupMockContext({
      searchResults: ref([
        { id: 10, name: 'SearchUser', avatarImg: '' },
      ]),
    })
    const { default: MessageSidebar } = await import('../../../components/layout/messageSidebar.vue')
    const wrapper = mount(MessageSidebar, { global: _globalConfig })
    expect(wrapper.text()).toContain('SearchUser')
  })
})
