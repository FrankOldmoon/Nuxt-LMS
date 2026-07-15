/**
 * vfiles/edit.vue component test
 * @see modules/lms/components/ueditor/extensions/nodes/vue/vfiles/edit.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UButton: { template: '<button @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label'] },
  UInput: { template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'placeholder', 'size'] },
  UIcon: { template: '<span />', props: ['name'] },
  USeparator: { template: '<hr />', props: [] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('vfiles/edit.vue', () => {
  it('mounts with default config', async () => {
    const { default: VfilesEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/vfiles/edit.vue'
    )
    const wrapper = mount(VfilesEdit, {
      props: { config: { items: [] } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.exists()).toBe(true)
  })

  it('renders existing items from config', async () => {
    const { default: VfilesEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/vfiles/edit.vue'
    )
    const wrapper = mount(VfilesEdit, {
      props: {
        config: {
          items: [
            { id: '1', type: 'folder', label: 'Folder 1', children: [
              { id: '2', type: 'file', label: 'File 1', content: '' },
            ] },
            { id: '3', type: 'file', label: 'File 2', content: '' },
          ],
        },
      },
      global: _globalConfig,
    })
    await flushPromises()
    const inputs = wrapper.findAll('input')
    expect(inputs.length).toBeGreaterThanOrEqual(3)
  })

  it('emits update:config and close on save click', async () => {
    const { default: VfilesEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/vfiles/edit.vue'
    )
    const wrapper = mount(VfilesEdit, {
      props: {
        config: {
          items: [
            { id: '1', type: 'file', label: 'File 1', content: '' },
          ],
        },
      },
      global: _globalConfig,
    })
    await flushPromises()
    const saveBtn = wrapper.findAll('button').find(b => b.text().includes('common.save'))
    await saveBtn!.trigger('click')
    const updateEvents = wrapper.emitted('update:config')
    const closeEvents = wrapper.emitted('close')
    expect(updateEvents).toBeTruthy()
    expect(closeEvents).toBeTruthy()
    const emittedConfig = updateEvents![0][0] as any
    expect(emittedConfig.items).toBeTruthy()
  })
})
