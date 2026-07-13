/**
 * sheet/index.vue 组件测试 (TipTap node-view)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/sheet/index.vue
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
  Sheet: { template: '<div class="sheet-stub" />', props: ['colWidths', 'rowCount', 'showTools', 'showFooter', 'showContextMenu', 'active', 'initialData'], methods: { reset() {}, getCellData() { return null } } },
  UFormField: { template: '<div class="uform-field"><slot /></div>', props: ['label', 'size'] },
  UInput: { template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'type', 'placeholder', 'size'] },
  UButton: { template: '<button @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('sheet/index.vue', () => {
  it('mounts and sets meta title/hasSettings', async () => {
    const { default: SheetIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/sheet/index.vue'
    )
    const meta = reactive({ title: '', icon: '', hasSettings: false })
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', meta)
    const wrapper = mount(SheetIndex, {
      props: {
        node: { attrs: { content: JSON.stringify({ height: 400 }) } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(meta.title).toBe('ueditor.sheet')
    expect(meta.hasSettings).toBe(true)
  })

  it('renders Sheet component', async () => {
    const { default: SheetIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/sheet/index.vue'
    )
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))
    const wrapper = mount(SheetIndex, {
      props: {
        node: { attrs: { content: '' } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.sheet-stub').exists()).toBe(true)
  })

  it('applies height from config', async () => {
    const { default: SheetIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/sheet/index.vue'
    )
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))
    const wrapper = mount(SheetIndex, {
      props: {
        node: { attrs: { content: JSON.stringify({ height: 500 }) } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.vue-node-body').attributes('style') || '').toContain('500px')
  })
})
