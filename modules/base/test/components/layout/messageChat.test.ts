/**
 * MessageChat 组件测试
 * @see modules/base/components/layout/messageChat.vue
 *
 * 消息聊天区：消息列表 + 输入框 + 发送
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'
import { provideMessages } from '../../../composables/useMessages'

// 在模块顶层导入并暴露到 globalThis（beforeEach 中不能使用 await import）
import { useMessagesContext } from '../../../composables/useMessages'
;(globalThis as any).useMessagesContext = useMessagesContext

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // 确保每个测试都能访问到 useMessagesContext
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
  UIcon: { template: '<span class="icon" />', props: ['name'] },
  UInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @keyup.enter="$emit(\'keyup.enter\')" />',
    props: ['modelValue', 'placeholder', 'size'],
    emits: ['update:modelValue', 'keyup.enter'],
  },
  UButton: {
    template: '<button @click="$emit(\'click\', $event)"><slot />{{ label }}</button>',
    props: ['icon', 'color', 'size', 'loading', 'disabled', 'label'],
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

describe('layout/messageChat.vue', () => {
  beforeEach(() => {
    // 清除可能的 async beforeEach 问题，直接赋值
    ;(globalThis as any).useMessagesContext = useMessagesContext
  })

  it('无选中用户时显示选择会话提示', async () => {
    setupMockContext({ selectedUserId: ref(0) })
    const { default: MessageChat } = await import('../../../components/layout/messageChat.vue')
    const wrapper = mount(MessageChat, { global: _globalConfig })
    expect(wrapper.text()).toContain('message.selectConversation')
  })

  it('选中用户时显示聊天头部和输入框', async () => {
    setupMockContext({
      selectedUserId: ref(2),
      selectedUser: ref({ name: 'Alice', avatarImg: '' }),
    })
    const { default: MessageChat } = await import('../../../components/layout/messageChat.vue')
    const wrapper = mount(MessageChat, { global: _globalConfig })
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.find('input').exists()).toBe(true)
  })

  it('消息加载中时显示 loading 图标', async () => {
    setupMockContext({
      selectedUserId: ref(2),
      selectedUser: ref({ name: 'Alice' }),
      msgLoading: ref(true),
    })
    const { default: MessageChat } = await import('../../../components/layout/messageChat.vue')
    const wrapper = mount(MessageChat, { global: _globalConfig })
    expect(wrapper.findAll('.icon').length).toBeGreaterThan(0)
  })

  it('无消息时显示空状态', async () => {
    setupMockContext({
      selectedUserId: ref(2),
      selectedUser: ref({ name: 'Alice' }),
      messages: ref([]),
      msgLoading: ref(false),
    })
    const { default: MessageChat } = await import('../../../components/layout/messageChat.vue')
    const wrapper = mount(MessageChat, { global: _globalConfig })
    expect(wrapper.text()).toContain('message.empty')
  })

  it('有消息时渲染消息列表', async () => {
    setupMockContext({
      selectedUserId: ref(2),
      selectedUser: ref({ name: 'Alice' }),
      messages: ref([
        { id: 1, senderUserId: 1, content: { text: '你好' }, createdAt: '2026-01-01T00:00:00Z' },
        { id: 2, senderUserId: 2, content: { text: '你好呀' }, createdAt: '2026-01-01T00:01:00Z' },
      ]),
    })
    const { default: MessageChat } = await import('../../../components/layout/messageChat.vue')
    const wrapper = mount(MessageChat, { global: _globalConfig })
    expect(wrapper.text()).toContain('你好')
    expect(wrapper.text()).toContain('你好呀')
  })
})
