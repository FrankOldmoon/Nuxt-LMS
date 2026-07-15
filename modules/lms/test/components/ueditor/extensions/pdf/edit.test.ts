/**
 * pdf/edit.vue component test
 * @see modules/lms/components/ueditor/extensions/nodes/vue/pdf/edit.vue
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
  UInput: { template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'type', 'placeholder', 'size'] },
  UButton: { template: '<button @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label'] },
  FormInputFile: { template: '<input type="file" class="form-input-file" />', props: ['modelValue', 'multiple', 'placeholder'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('pdf/edit.vue', () => {
  it('mounts with default config', async () => {
    const { default: PdfEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/pdf/edit.vue'
    )
    const wrapper = mount(PdfEdit, {
      props: { config: {} },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.uform-field').exists()).toBe(true)
  })

  it('initializes fields from config prop', async () => {
    const { default: PdfEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/pdf/edit.vue'
    )
    const wrapper = mount(PdfEdit, {
      props: { config: { url: 'https://example.com/doc.pdf', pages: '1-3', height: 1000 } },
      global: _globalConfig,
    })
    expect(wrapper.find('.uform-field').exists()).toBe(true)
  })

  it('emits update:config and close on save click', async () => {
    const { default: PdfEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/pdf/edit.vue'
    )
    const wrapper = mount(PdfEdit, {
      props: { config: { url: 'https://example.com/doc.pdf', pages: '1-3', height: 800 } },
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
    expect(emittedConfig.url).toBe('https://example.com/doc.pdf')
    expect(emittedConfig.pages).toBe('1-3')
    expect(emittedConfig.height).toBe(800)
  })
})
