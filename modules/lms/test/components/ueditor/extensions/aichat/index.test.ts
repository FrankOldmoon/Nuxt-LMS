/**
 * aichat/index.vue 组件测试 (TipTap node-view)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/aichat/index.vue
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
  AiLlm: { template: '<div class="aichat-stub" />', props: ['mode', 'title', 'opening', 'preset', 'model', 'thinking', 'showSettings'] },
  UFormField: { template: '<div class="uform-field"><slot /></div>', props: ['label', 'size', 'hint'] },
  USelect: { template: '<select />', props: ['modelValue', 'items', 'size'] },
  UInput: { template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'placeholder', 'size', 'type'] },
  UTextarea: { template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'rows', 'size'] },
  USwitch: { template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />', props: ['modelValue'] },
  UButton: { template: '<button @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label'] },
  UIcon: { template: '<span />', props: ['name'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('aichat/index.vue', () => {
  it('mounts and sets meta title/icon/hasSettings', async () => {
    const { default: AichatIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/aichat/index.vue'
    )
    const meta = reactive({ title: '', icon: '', hasSettings: false })
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', meta)
    const wrapper = mount(AichatIndex, {
      props: {
        node: { attrs: { content: JSON.stringify({ title: 'My Bot' }) } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(meta.icon).toBe('i-lucide-bot')
    expect(meta.hasSettings).toBe(true)
    expect(meta.title).toBe('My Bot')
  })

  it('falls back to default title when config has no title', async () => {
    const { default: AichatIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/aichat/index.vue'
    )
    const meta = reactive({ title: '', icon: '', hasSettings: false })
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', meta)
    const wrapper = mount(AichatIndex, {
      props: {
        node: { attrs: { content: JSON.stringify({ mode: 'api' }) } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(meta.title).toBe('ueditor.aichat')
  })

  it('renders the Render child component', async () => {
    const { default: AichatIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/aichat/index.vue'
    )
    const meta = reactive({ title: '', icon: '', hasSettings: false })
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', meta)
    const wrapper = mount(AichatIndex, {
      props: {
        node: { attrs: { content: JSON.stringify({ title: 'Bot' }) } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.aichat-stub').exists()).toBe(true)
  })

  it('calls updateAttributes when config changes', async () => {
    const { default: AichatIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/aichat/index.vue'
    )
    const updateAttributes = vi.fn()
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))
    const wrapper = mount(AichatIndex, {
      props: {
        node: { attrs: { content: '' } },
        updateAttributes,
      },
      global: _globalConfig,
    })
    await flushPromises()
    const vm = wrapper.vm as any
    vm.onConfigChange({ title: 'New', mode: 'api' })
    await flushPromises()
    expect(updateAttributes).toHaveBeenCalledWith({ content: JSON.stringify({ title: 'New', mode: 'api' }) })
  })
})
