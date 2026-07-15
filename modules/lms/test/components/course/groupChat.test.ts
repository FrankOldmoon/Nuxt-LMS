/**
 * course/groupChat.vue component test
 * @see modules/lms/components/course/groupChat.vue
 *
 * Group chat: message list + input area
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // stub useGroupChat
  ;(globalThis as any).useGroupChat = (_props: any) => ({
    messages: ref([]),
    inputText: ref(''),
    msgListRef: ref(null),
    canChat: ref(true),
    cannotChatReason: ref(''),
    sendMessage: vi.fn(),
    formatTime: (v: any) => String(v),
    userId: 1,
  })
})

const _globalStubs = {
  UAvatar: {
    template: '<span class="uavatar">{{ alt || text }}</span>',
    props: ['src', 'alt', 'text', 'size'],
  },
  UInput: {
    template: '<input class="uinput" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" @keydown="$emit(\'keydown\', $event)" />',
    props: ['modelValue', 'placeholder', 'size', 'disabled', 'icon'],
  },
  UButton: {
    template: '<button class="ubutton" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['icon', 'color', 'size', 'disabled'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('course/groupChat.vue', () => {
  it('无消息时显示空提示', async () => {
    const { default: GroupChat } = await import('../../../components/course/groupChat.vue')
    const wrapper = mount(GroupChat, {
      props: { groupId: 'g1' },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('chatroom.empty')
  })

  it('渲染消息列表', async () => {
    ;(globalThis as any).useGroupChat = (_props: any) => ({
      messages: ref([
        { userId: 2, from: 'Alice', text: 'Hello', ts: '12:00', avatarImg: null },
        { userId: 1, from: 'Me', text: 'Hi', ts: '12:01', avatarImg: null },
      ]),
      inputText: ref(''),
      msgListRef: ref(null),
      canChat: ref(true),
      cannotChatReason: ref(''),
      sendMessage: vi.fn(),
      formatTime: (v: any) => String(v),
      userId: 1,
    })
    const { default: GroupChat } = await import('../../../components/course/groupChat.vue')
    const wrapper = mount(GroupChat, {
      props: { groupId: 'g1' },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('Hello')
    expect(wrapper.text()).toContain('Hi')
  })

  it('渲染输入框和发送按钮', async () => {
    const { default: GroupChat } = await import('../../../components/course/groupChat.vue')
    const wrapper = mount(GroupChat, {
      props: { groupId: 'g1' },
      global: _globalConfig,
    })
    expect(wrapper.find('.uinput').exists()).toBe(true)
    expect(wrapper.find('.ubutton').exists()).toBe(true)
  })

  it('canChat=false 时显示禁用原因', async () => {
    ;(globalThis as any).useGroupChat = (_props: any) => ({
      messages: ref([]),
      inputText: ref(''),
      msgListRef: ref(null),
      canChat: ref(false),
      cannotChatReason: ref('不能聊天'),
      sendMessage: vi.fn(),
      formatTime: (v: any) => String(v),
      userId: 1,
    })
    const { default: GroupChat } = await import('../../../components/course/groupChat.vue')
    const wrapper = mount(GroupChat, {
      props: { groupId: 'g1' },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('不能聊天')
  })

  it('正确接收 groupId prop', async () => {
    const { default: GroupChat } = await import('../../../components/course/groupChat.vue')
    const wrapper = mount(GroupChat, {
      props: { groupId: 'group_42' },
      global: _globalConfig,
    })
    expect(wrapper.props('groupId')).toBe('group_42')
  })
})
