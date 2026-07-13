/**
 * sheet/edit.vue 组件测试
 * @see modules/lms/components/ueditor/extensions/nodes/vue/sheet/edit.vue
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
  UInput: { template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'type', 'placeholder', 'size'] },
  UButton: { template: '<button @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('sheet/edit.vue', () => {
  it('mounts with default config', async () => {
    const { default: SheetEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/sheet/edit.vue'
    )
    const wrapper = mount(SheetEdit, {
      props: { config: {} },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.uform-field').exists()).toBe(true)
  })

  it('initializes height from config prop', async () => {
    const { default: SheetEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/sheet/edit.vue'
    )
    const wrapper = mount(SheetEdit, {
      props: { config: { height: 500 } },
      global: _globalConfig,
    })
    expect(wrapper.find('.uform-field').exists()).toBe(true)
  })

  it('emits update:config and close on save click', async () => {
    const { default: SheetEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/sheet/edit.vue'
    )
    const wrapper = mount(SheetEdit, {
      props: { config: { height: 400 } },
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
    expect(emittedConfig.height).toBe(400)
  })
})
