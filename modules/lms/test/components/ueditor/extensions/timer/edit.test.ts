/**
 * timer/edit.vue component test
 * @see modules/lms/components/ueditor/extensions/nodes/vue/timer/edit.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UFormField: { template: '<div class="uform-field"><slot /></div>', props: ['label', 'size'] },
  UInput: { template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'type', 'placeholder', 'size', 'min', 'max'] },
  UButton: { template: '<button @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('timer/edit.vue', () => {
  it('mounts with default config', async () => {
    const { default: TimerEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/timer/edit.vue'
    )
    const wrapper = mount(TimerEdit, {
      props: { config: { minutes: 1, seconds: 0 } },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.uform-field').exists()).toBe(true)
  })

  it('emits update:config when minutes change', async () => {
    const { default: TimerEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/timer/edit.vue'
    )
    const wrapper = mount(TimerEdit, {
      props: { config: { minutes: 5, seconds: 30 } },
      global: _globalConfig,
    })
    await flushPromises()
    // Find the minutes input (first input)
    const inputs = wrapper.findAll('input')
    const minutesInput = inputs[0]
    await minutesInput.setValue('10')
    const updateEvents = wrapper.emitted('update:config')
    expect(updateEvents).toBeTruthy()
    const emittedConfig = updateEvents![0][0] as any
    expect(emittedConfig.minutes).toBe(10)
  })

  it('emits close when save button clicked', async () => {
    const { default: TimerEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/timer/edit.vue'
    )
    const wrapper = mount(TimerEdit, {
      props: { config: { minutes: 1, seconds: 0 } },
      global: _globalConfig,
    })
    await flushPromises()
    const buttons = wrapper.findAll('button')
    const saveBtn = buttons[buttons.length - 1]
    await saveBtn.trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
