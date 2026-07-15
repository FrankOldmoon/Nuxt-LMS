/**
 * stepper/edit.vue component test
 * @see modules/lms/components/ueditor/extensions/nodes/vue/stepper/edit.vue
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  USelect: { template: '<select />', props: ['modelValue', 'items', 'valueKey', 'size'] },
  UTextarea: { template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'rows', 'autoresize', 'placeholder'] },
  UButton: { template: '<button :disabled="disabled" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label', 'disabled'] },
  USeparator: { template: '<hr />', props: [] },
  RichEditor: { template: '<div class="rich-editor-stub" />', props: ['modelValue'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('stepper/edit.vue', () => {
  it('mounts with default config', async () => {
    const { default: StepperEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/stepper/edit.vue'
    )
    const wrapper = mount(StepperEdit, {
      props: { config: {} },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('mounts with steps from config', async () => {
    const { default: StepperEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/stepper/edit.vue'
    )
    const wrapper = mount(StepperEdit, {
      props: {
        config: {
          orientation: 'vertical',
          steps: [
            { title: 'Step 1', description: 'desc 1' },
            { title: 'Step 2', description: 'desc 2' },
          ],
        },
      },
      global: _globalConfig,
    })
    expect(wrapper.findAll('.rich-editor-stub').length).toBeGreaterThanOrEqual(2)
  })

  it('emits close when save button clicked', async () => {
    const { default: StepperEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/stepper/edit.vue'
    )
    const wrapper = mount(StepperEdit, {
      props: { config: { orientation: 'horizontal', steps: [{ title: '', description: '' }] } },
      global: _globalConfig,
    })
    await flushPromises()
    // Find the save button (last UButton with variant="soft")
    const buttons = wrapper.findAll('button')
    const saveBtn = buttons[buttons.length - 1]
    await saveBtn.trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
