/**
 * chatroom/index.vue 组件测试
 * @see modules/lms/components/ueditor/extensions/nodes/vue/chatroom/index.vue
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n, setMockAuthUser, setMockRuntimeConfig } from '../../../../../../../test/setup/nuxt-stubs'

// Stub useWebSocket (not in nuxt-stubs)
;(globalThis as any).useWebSocket = () => ({
  wsConnected: ref(false),
  connect: vi.fn(),
  sendChatroom: vi.fn(),
  onChatroom: () => {},
})

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  setMockRuntimeConfig({ public: { moduleLms: true } })
  setMockAuthUser({ id: 1, name: 'student', defaultClass: { id: 1 } }, [{ code: 'student' }], [])
})

const _globalStubs = {
  UAvatar: { template: '<span class="uavatar" />', props: ['src', 'alt', 'size', 'text'] },
  UInput: { template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @keydown.enter="$emit(\'keydown.enter\', $event)" />', props: ['modelValue', 'placeholder', 'size', 'disabled'] },
  UButton: { template: '<button :disabled="disabled" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'disabled', 'label'] },
  UIcon: { template: '<span />', props: ['name'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('chatroom/index.vue', () => {
  it('mounts and shows chatroom when lms enabled and user has class', async () => {
    const { default: ChatroomIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/chatroom/index.vue'
    )
    const wrapper = mount(ChatroomIndex, {
      props: { node: { attrs: {} } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.chatroom-render').exists()).toBe(true)
  })

  it('shows placeholder when lms disabled', async () => {
    setMockRuntimeConfig({ public: { moduleLms: false } })
    const { default: ChatroomIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/chatroom/index.vue'
    )
    const wrapper = mount(ChatroomIndex, {
      props: { node: { attrs: {} } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('chatroom.needLms')
  })

  it('shows empty message when no messages', async () => {
    const { default: ChatroomIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/chatroom/index.vue'
    )
    const wrapper = mount(ChatroomIndex, {
      props: { node: { attrs: {} } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('chatroom.empty')
  })

  it('shows needClass when user has no class', async () => {
    setMockAuthUser({ id: 1, name: 'student' }, [{ code: 'student' }], [])
    const { default: ChatroomIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/chatroom/index.vue'
    )
    const wrapper = mount(ChatroomIndex, {
      props: { node: { attrs: {} } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('chatroom.needClass')
  })
})
