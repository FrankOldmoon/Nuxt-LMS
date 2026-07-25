/**
 * tabs/edit.vue 组件测试
 * @see modules/lms/components/ueditor/extensions/nodes/vue/tabs/edit.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UInput: { template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'placeholder', 'size'] },
  UButton: { template: '<button :disabled="disabled" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label', 'disabled'] },
  USeparator: { template: '<hr />', props: [] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('tabs/edit.vue', () => {
  it('mounts with default config', async () => {
    const { default: TabsEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/tabs/edit.vue'
    )
    const wrapper = mount(TabsEdit, {
      props: { config: {} },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('renders existing tab labels', async () => {
    const { default: TabsEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/tabs/edit.vue'
    )
    const wrapper = mount(TabsEdit, {
      props: {
        config: {
          tabs: [
            { label: 'Tab A', content: '' },
            { label: 'Tab B', content: '' },
          ],
        },
      },
      global: _globalConfig,
    })
    const inputs = wrapper.findAll('input')
    expect(inputs.length).toBeGreaterThanOrEqual(2)
  })

  it('emits update:config and close on save click', async () => {
    const { default: TabsEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/tabs/edit.vue'
    )
    const wrapper = mount(TabsEdit, {
      props: { config: { tabs: [{ label: 'Tab 1', content: '' }] } },
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
    expect(emittedConfig.tabs).toBeTruthy()
    expect(emittedConfig.tabs[0].label).toBe('Tab 1')
  })
})
