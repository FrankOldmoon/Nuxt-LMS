/**
 * aichat/edit.vue 组件测试
 * @see modules/lms/components/ueditor/extensions/nodes/vue/aichat/edit.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UFormField: { template: '<div class="uform-field"><slot /></div>', props: ['label', 'size', 'hint'] },
  USelect: { template: '<select />', props: ['modelValue', 'items', 'size'] },
  UInput: { template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'placeholder', 'size', 'type'] },
  UTextarea: { template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'rows', 'size'] },
  USwitch: { template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />', props: ['modelValue'] },
  UButton: { template: '<button @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('aichat/edit.vue', () => {
  it('mounts with default config', async () => {
    const { default: AichatEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/aichat/edit.vue'
    )
    const wrapper = mount(AichatEdit, {
      props: { config: {} },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('initializes fields from config prop', async () => {
    const { default: AichatEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/aichat/edit.vue'
    )
    const wrapper = mount(AichatEdit, {
      props: {
        config: {
          mode: 'ollama',
          title: 'My Title',
          preset: 'preset text',
          opening: 'opening text',
          model: 'llama3.2',
          thinking: true,
        },
      },
      global: _globalConfig,
    })
    // The select should be rendered (stubbed); verify the component mounted
    expect(wrapper.find('.uform-field').exists()).toBe(true)
  })

  it('emits update:config and close when save button clicked', async () => {
    const { default: AichatEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/aichat/edit.vue'
    )
    const wrapper = mount(AichatEdit, {
      props: { config: { mode: 'api', title: 'T', model: 'glm-4.5-air' } },
      global: _globalConfig,
    })
    await flushPromises()
    // Find save button (last UButton) and click
    const buttons = wrapper.findAll('button')
    const saveBtn = buttons[buttons.length - 1]
    await saveBtn.trigger('click')
    const updateEvents = wrapper.emitted('update:config')
    const closeEvents = wrapper.emitted('close')
    expect(updateEvents).toBeTruthy()
    expect(closeEvents).toBeTruthy()
    const emittedConfig = updateEvents![0][0] as any
    expect(emittedConfig.mode).toBe('api')
    expect(emittedConfig.title).toBe('T')
    expect(emittedConfig.model).toBe('glm-4.5-air')
  })
})
