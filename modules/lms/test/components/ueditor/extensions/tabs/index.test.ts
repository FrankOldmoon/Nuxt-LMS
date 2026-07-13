/**
 * tabs/index.vue 组件测试 (TipTap node-view)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/tabs/index.vue
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, reactive } from 'vue'
import { resetAllStubs, setMockI18n, provide } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UTabs: { template: '<div class="utabs-stub"><slot name="content" :item="{ content: \'\' }" /></div>', props: ['items'] },
  RichEditor: { template: '<div class="rich-editor-stub" />', props: ['modelValue'] },
  UInput: { template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'placeholder', 'size'] },
  UButton: { template: '<button :disabled="disabled" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label', 'disabled'] },
  USeparator: { template: '<hr />', props: [] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('tabs/index.vue', () => {
  it('mounts and sets meta title/icon/hasSettings', async () => {
    const { default: TabsIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/tabs/index.vue'
    )
    const meta = reactive({ title: '', icon: '', hasSettings: false })
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', meta)
    const wrapper = mount(TabsIndex, {
      props: {
        node: { attrs: { content: JSON.stringify({ tabs: [{ label: 'Tab 1', content: '' }] }) } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(meta.title).toBe('ueditor.tabs')
    expect(meta.icon).toBe('i-lucide-panel-top')
    expect(meta.hasSettings).toBe(true)
  })

  it('renders UTabs component', async () => {
    const { default: TabsIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/tabs/index.vue'
    )
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))
    const wrapper = mount(TabsIndex, {
      props: {
        node: { attrs: { content: '' } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.utabs-stub').exists()).toBe(true)
  })

  it('calls updateAttributes on config change', async () => {
    const { default: TabsIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/tabs/index.vue'
    )
    const updateAttributes = vi.fn()
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))
    const wrapper = mount(TabsIndex, {
      props: {
        node: { attrs: { content: '' } },
        updateAttributes,
      },
      global: _globalConfig,
    })
    await flushPromises()
    const vm = wrapper.vm as any
    vm.onConfigChange({ tabs: [{ label: 'New', content: '' }] })
    await flushPromises()
    expect(updateAttributes).toHaveBeenCalledWith({ content: JSON.stringify({ tabs: [{ label: 'New', content: '' }] }) })
  })
})
