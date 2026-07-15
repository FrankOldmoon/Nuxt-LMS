/**
 * chatroom/render.vue component test
 * @see modules/lms/components/ueditor/extensions/nodes/vue/chatroom/render.vue
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n, setMockAuthUser, setMockRuntimeConfig } from '../../../../../../../test/setup/nuxt-stubs'

// Stub useWebSocket (used by chatroom/index.vue which is rendered by render.vue)
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
  UInput: { template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'placeholder', 'size', 'disabled'] },
  UButton: { template: '<button :disabled="disabled" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'disabled', 'label'] },
  UIcon: { template: '<span />', props: ['name'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('chatroom/render.vue', () => {
  it('mounts and passes node to Chatroom', async () => {
    const { default: ChatroomRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/chatroom/render.vue'
    )
    const wrapper = mount(ChatroomRender, {
      props: { node: { attrs: {} } },
      global: _globalConfig,
    })
    await flushPromises()
    // render.vue is a thin wrapper that renders Chatroom (index.vue)
    expect(wrapper.find('.chatroom-render').exists()).toBe(true)
  })

  it('shows chatroom label', async () => {
    const { default: ChatroomRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/chatroom/render.vue'
    )
    const wrapper = mount(ChatroomRender, {
      props: { node: { attrs: {} } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('chatroom.label')
  })
})
