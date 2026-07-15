/**
 * aigenerator/index.vue component test (TipTap node-view)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/aigenerator/index.vue
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, reactive } from 'vue'
import { resetAllStubs, setMockI18n, provide } from '../../../../../../../test/setup/nuxt-stubs'

// Stub composables used by Render via useAiGeneratorRender
;(globalThis as any).useChapterTask = () => null

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  QuestionRender: { template: '<div class="question-render-stub" />', props: ['question', 'node'] },
  UFormField: { template: '<div class="uform-field"><slot /></div>', props: ['label', 'size', 'hint'] },
  USelect: { template: '<select />', props: ['modelValue', 'items', 'size'] },
  UInput: { template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'placeholder', 'size', 'type'] },
  UTextarea: { template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'rows', 'size'] },
  USwitch: { template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />', props: ['modelValue'] },
  UButton: { template: '<button @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label', 'disabled', 'loading'] },
  UIcon: { template: '<span />', props: ['name'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('aigenerator/index.vue', () => {
  it('mounts and sets meta title/icon/hasSettings', async () => {
    const { default: AigeneratorIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/aigenerator/index.vue'
    )
    const meta = reactive({ title: '', icon: '', hasSettings: false })
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', meta)
    const wrapper = mount(AigeneratorIndex, {
      props: {
        node: { attrs: { content: JSON.stringify({ title: 'Gen' }) } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(meta.icon).toBe('i-lucide-sparkles')
    expect(meta.hasSettings).toBe(true)
    expect(meta.title).toBe('Gen')
  })

  it('uses default title when config has no title', async () => {
    const { default: AigeneratorIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/aigenerator/index.vue'
    )
    const meta = reactive({ title: '', icon: '', hasSettings: false })
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', meta)
    const wrapper = mount(AigeneratorIndex, {
      props: {
        node: { attrs: { content: JSON.stringify({ questionType: 'single' }) } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(meta.title).toBe('ueditor.aigenerator')
  })

  it('calls updateAttributes on config change', async () => {
    const { default: AigeneratorIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/aigenerator/index.vue'
    )
    const updateAttributes = vi.fn()
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))
    const wrapper = mount(AigeneratorIndex, {
      props: {
        node: { attrs: { content: '' } },
        updateAttributes,
      },
      global: _globalConfig,
    })
    await flushPromises()
    const vm = wrapper.vm as any
    vm.onConfigChange({ title: 'New', questionType: 'single' })
    await flushPromises()
    expect(updateAttributes).toHaveBeenCalledWith({ content: JSON.stringify({ title: 'New', questionType: 'single' }) })
  })
})
