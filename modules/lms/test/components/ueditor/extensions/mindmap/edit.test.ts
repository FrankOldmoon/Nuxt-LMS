/**
 * mindmap/edit.vue 组件测试
 * @see modules/lms/components/ueditor/extensions/nodes/vue/mindmap/edit.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  Monaco: { template: '<div class="monaco-stub" />', props: ['modelValue', 'language'] },
  UButton: { template: '<button @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label'] },
  USeparator: { template: '<hr />', props: [] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('mindmap/edit.vue', () => {
  it('mounts with string config', async () => {
    const { default: MindmapEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/mindmap/edit.vue'
    )
    const wrapper = mount(MindmapEdit, {
      props: { config: '# Title' },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.monaco-stub').exists()).toBe(true)
  })

  it('mounts with empty config', async () => {
    const { default: MindmapEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/mindmap/edit.vue'
    )
    const wrapper = mount(MindmapEdit, {
      props: { config: '' },
      global: _globalConfig,
    })
    expect(wrapper.find('.monaco-stub').exists()).toBe(true)
  })

  it('emits update:config and close on save click', async () => {
    const { default: MindmapEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/mindmap/edit.vue'
    )
    const wrapper = mount(MindmapEdit, {
      props: { config: '# Title' },
      global: _globalConfig,
    })
    await flushPromises()
    // Find the save button (primary, last)
    const buttons = wrapper.findAll('button')
    const saveBtn = buttons[buttons.length - 1]
    await saveBtn.trigger('click')
    const updateEvents = wrapper.emitted('update:config')
    const closeEvents = wrapper.emitted('close')
    expect(updateEvents).toBeTruthy()
    expect(closeEvents).toBeTruthy()
    expect(updateEvents![0][0]).toBe('# Title')
  })
})
