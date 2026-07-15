/**
 * condition edit component test
 * @see modules/lms/components/ueditor/extensions/nodes/vue/condition/edit.vue
 *
 * useConditionEdit returns directly (non provide/inject mode), uses useLmsContext + cRequest + $fetch
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n, setMockLmsContext } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  setMockLmsContext(1, 1)
})

const _globalStubs = {
  UButton: { template: '<button @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label'] },
  UIcon: { template: '<span />', props: ['name'] },
  USelect: { template: '<select :multiple="multiple"><option v-for="opt in items" :key="opt.value" :value="opt.value">{{ opt.label }}</option></select>', props: ['modelValue', 'items', 'size', 'multiple'] },
  USeparator: { template: '<hr />' },
  UFormField: { template: '<div><slot /></div>', props: ['label', 'size'] },
  RichEditor: { template: '<div class="rich-editor" />', props: ['modelValue'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('condition/edit.vue', () => {
  it('mounts and renders the edit form', async () => {
    const { default: ConditionEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/condition/edit.vue'
    )
    const wrapper = mount(ConditionEdit, {
      props: { config: { conditions: [], content: '' } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('renders existing conditions from config', async () => {
    const { default: ConditionEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/condition/edit.vue'
    )
    const wrapper = mount(ConditionEdit, {
      props: {
        config: {
          conditions: [
            { type: 'role', value: 'admin', label: 'Admin' },
            { type: 'class', value: '1', label: 'Class 1' },
          ],
          content: '<p>locked content</p>',
        },
      },
      global: _globalConfig,
    })
    await flushPromises()
    // Each condition renders a row with a USelect; 2 conditions = 2 rows
    const selects = wrapper.findAll('select')
    expect(selects.length).toBeGreaterThanOrEqual(2)
  })

  it('emits update:config and close when save button clicked', async () => {
    const { default: ConditionEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/condition/edit.vue'
    )
    const wrapper = mount(ConditionEdit, {
      props: { config: { conditions: [], content: '' } },
      global: _globalConfig,
    })
    await flushPromises()
    // Find the save button (last button — the one with common.save label)
    const buttons = wrapper.findAll('button')
    const saveButton = buttons[buttons.length - 1]
    await saveButton.trigger('click')
    await flushPromises()
    const emitted = wrapper.emitted('update:config')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toHaveProperty('conditions')
    expect(emitted![0][0]).toHaveProperty('content')
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
