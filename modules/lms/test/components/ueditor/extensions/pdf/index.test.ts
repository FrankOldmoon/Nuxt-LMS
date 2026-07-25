/**
 * pdf/index.vue 组件测试 (TipTap node-view)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/pdf/index.vue
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
  UFormField: { template: '<div class="uform-field"><slot /></div>', props: ['label', 'size', 'hint'] },
  UInput: { template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'type', 'placeholder', 'size'] },
  UButton: { template: '<button @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label'] },
  UIcon: { template: '<span />', props: ['name'] },
  FormInputFile: { template: '<input type="file" class="form-input-file" />', props: ['modelValue', 'multiple', 'placeholder'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('pdf/index.vue', () => {
  it('mounts and sets meta icon/hasSettings', async () => {
    const { default: PdfIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/pdf/index.vue'
    )
    const meta = reactive({ title: '', icon: '', hasSettings: false })
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', meta)
    const wrapper = mount(PdfIndex, {
      props: {
        node: { attrs: { content: JSON.stringify({ name: 'Doc.pdf' }) } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(meta.icon).toBe('i-lucide-file-text')
    expect(meta.hasSettings).toBe(true)
    expect(meta.title).toBe('Doc.pdf')
  })

  it('shows placeholder when no url configured', async () => {
    const { default: PdfIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/pdf/index.vue'
    )
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))
    const wrapper = mount(PdfIndex, {
      props: {
        node: { attrs: { content: '' } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('ueditor.pdfSelectHint')
  })

  it('renders Render when url is configured', async () => {
    const { default: PdfIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/pdf/index.vue'
    )
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))
    const wrapper = mount(PdfIndex, {
      props: {
        node: { attrs: { content: JSON.stringify({ url: 'https://example.com/doc.pdf', name: 'doc' }) } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.pdf-render-container').exists()).toBe(true)
  })

  it('calls updateAttributes on config change', async () => {
    const { default: PdfIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/pdf/index.vue'
    )
    const updateAttributes = vi.fn()
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))
    const wrapper = mount(PdfIndex, {
      props: {
        node: { attrs: { content: '' } },
        updateAttributes,
      },
      global: _globalConfig,
    })
    await flushPromises()
    const vm = wrapper.vm as any
    vm.onConfigChange({ url: 'https://example.com/doc.pdf', name: 'doc' })
    await flushPromises()
    expect(updateAttributes).toHaveBeenCalledWith({ content: JSON.stringify({ url: 'https://example.com/doc.pdf', name: 'doc' }) })
  })
})
