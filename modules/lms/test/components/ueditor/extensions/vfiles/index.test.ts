/**
 * vfiles/index.vue 组件测试 (TipTap node-view)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/vfiles/index.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, reactive } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UNavigationMenu: { template: '<div class="unavigation-menu-stub" />', props: ['items', 'orientation'] },
  RichEditor: { template: '<div class="rich-editor-stub" />', props: ['modelValue'] },
  UIcon: { template: '<span />', props: ['name'] },
  UButton: { template: '<button @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label'] },
  UInput: { template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'placeholder', 'size'] },
  USeparator: { template: '<hr />', props: [] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('vfiles/index.vue', () => {
  it('mounts and sets meta title/icon/hasSettings', async () => {
    const { default: VfilesIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/vfiles/index.vue'
    )
    const meta = reactive({ title: '', icon: '', hasSettings: false })
    const wrapper = mount(VfilesIndex, {
      props: {
        node: { attrs: { content: JSON.stringify({ items: [] }) } },
        updateAttributes: () => {},
      },
      global: {
        ..._globalConfig,
        provide: {
          nodeViewShowConfig: ref(false),
          nodeViewMeta: meta,
        },
      },
    })
    await flushPromises()
    expect(meta.title).toBe('ueditor.vfiles')
    expect(meta.icon).toBe('i-lucide-folder-tree')
    expect(meta.hasSettings).toBe(true)
  })

  it('shows select hint when no file selected', async () => {
    const { default: VfilesIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/vfiles/index.vue'
    )
    const wrapper = mount(VfilesIndex, {
      props: {
        node: { attrs: { content: JSON.stringify({ items: [] }) } },
        updateAttributes: () => {},
      },
      global: {
        ..._globalConfig,
        provide: {
          nodeViewShowConfig: ref(false),
          nodeViewMeta: reactive({ title: '', icon: '', hasSettings: false }),
        },
      },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('ueditor.vfilesSelectHint')
  })

  it('renders navigation menu', async () => {
    const { default: VfilesIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/vfiles/index.vue'
    )
    const wrapper = mount(VfilesIndex, {
      props: {
        node: { attrs: { content: JSON.stringify({ items: [{ id: '1', type: 'file', label: 'file1', content: '' }] }) } },
        updateAttributes: () => {},
      },
      global: {
        ..._globalConfig,
        provide: {
          nodeViewShowConfig: ref(false),
          nodeViewMeta: reactive({ title: '', icon: '', hasSettings: false }),
        },
      },
    })
    await flushPromises()
    expect(wrapper.find('.unavigation-menu-stub').exists()).toBe(true)
  })
})
