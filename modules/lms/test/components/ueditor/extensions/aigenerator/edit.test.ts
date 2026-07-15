/**
 * aigenerator/edit.vue component test
 * @see modules/lms/components/ueditor/extensions/nodes/vue/aigenerator/edit.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

// Stub useLayoutState to provide chapterContent
;(globalThis as any).useLayoutState = () => ({
  chapterContent: ref(null),
  notifyCourseNavUpdate: () => {},
})
// Stub extractPlainText (auto-imported util)
;(globalThis as any).extractPlainText = (val: any) => (typeof val === 'string' ? val : '')

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

describe('aigenerator/edit.vue', () => {
  it('mounts with default config', async () => {
    const { default: AigeneratorEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/aigenerator/edit.vue'
    )
    const wrapper = mount(AigeneratorEdit, {
      props: { config: {} },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.uform-field').exists()).toBe(true)
  })

  it('initializes fields from config prop', async () => {
    const { default: AigeneratorEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/aigenerator/edit.vue'
    )
    const wrapper = mount(AigeneratorEdit, {
      props: {
        config: {
          title: 'My Quiz',
          questionType: 'multiple',
          referenceText: 'ref text',
          point: 5,
          model: 'glm-4.5-air',
          thinking: true,
        },
      },
      global: _globalConfig,
    })
    expect(wrapper.find('.uform-field').exists()).toBe(true)
  })

  it('emits update:config and close on save click', async () => {
    const { default: AigeneratorEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/aigenerator/edit.vue'
    )
    const wrapper = mount(AigeneratorEdit, {
      props: { config: { title: 'T', questionType: 'single', point: 2 } },
      global: _globalConfig,
    })
    await flushPromises()
    const buttons = wrapper.findAll('button')
    const saveBtn = buttons[buttons.length - 1]
    await saveBtn.trigger('click')
    const updateEvents = wrapper.emitted('update:config')
    const closeEvents = wrapper.emitted('close')
    expect(updateEvents).toBeTruthy()
    expect(closeEvents).toBeTruthy()
    const emittedConfig = updateEvents![0][0] as any
    expect(emittedConfig.title).toBe('T')
    expect(emittedConfig.questionType).toBe('single')
    expect(emittedConfig.point).toBe(2)
  })
})
