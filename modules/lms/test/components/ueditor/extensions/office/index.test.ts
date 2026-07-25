/**
 * office/index.vue 组件测试 (TipTap node-view)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/office/index.vue
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
  UFormField: { template: '<div class="uform-field"><slot /></div>', props: ['label', 'size'] },
  UInput: { template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'type', 'placeholder', 'size'] },
  UButton: { template: '<button @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label'] },
  UIcon: { template: '<span />', props: ['name'] },
  FormInputFile: { template: '<input type="file" class="form-input-file" />', props: ['modelValue', 'multiple', 'placeholder'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('office/index.vue', () => {
  it('mounts and sets meta icon/hasSettings', async () => {
    const { default: OfficeIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/office/index.vue'
    )
    const meta = reactive({ title: '', icon: '', hasSettings: false })
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', meta)
    const wrapper = mount(OfficeIndex, {
      props: {
        node: { attrs: { content: JSON.stringify({ name: 'Doc.xlsx' }) } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(meta.icon).toBe('i-lucide-file-spreadsheet')
    expect(meta.hasSettings).toBe(true)
    expect(meta.title).toBe('Doc.xlsx')
  })

  it('shows placeholder when no url configured', async () => {
    const { default: OfficeIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/office/index.vue'
    )
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))
    const wrapper = mount(OfficeIndex, {
      props: {
        node: { attrs: { content: '' } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('ueditor.officeSelectHint')
  })

  it('renders Render when url is configured', async () => {
    const { default: OfficeIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/office/index.vue'
    )
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))
    const wrapper = mount(OfficeIndex, {
      props: {
        node: { attrs: { content: JSON.stringify({ url: 'https://example.com/doc.xlsx', name: 'doc' }) } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('iframe').exists()).toBe(true)
  })

  it('calls updateAttributes on config change', async () => {
    const { default: OfficeIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/office/index.vue'
    )
    const updateAttributes = vi.fn()
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))
    const wrapper = mount(OfficeIndex, {
      props: {
        node: { attrs: { content: '' } },
        updateAttributes,
      },
      global: _globalConfig,
    })
    await flushPromises()
    const vm = wrapper.vm as any
    vm.onConfigChange({ url: 'https://example.com/doc.xlsx', name: 'doc' })
    await flushPromises()
    expect(updateAttributes).toHaveBeenCalledWith({ content: JSON.stringify({ url: 'https://example.com/doc.xlsx', name: 'doc' }) })
  })
})
