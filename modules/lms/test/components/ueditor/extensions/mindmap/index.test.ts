/**
 * mindmap/index.vue component test (TipTap node-view)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/mindmap/index.vue
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
  Monaco: { template: '<div class="monaco-stub" />', props: ['modelValue', 'language'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('mindmap/index.vue', () => {
  it('mounts and sets meta title/icon/hasSettings', async () => {
    const { default: MindmapIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/mindmap/index.vue'
    )
    const meta = reactive({ title: '', icon: '', hasSettings: false })
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', meta)
    const wrapper = mount(MindmapIndex, {
      props: {
        node: { attrs: { content: '# Title' } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(meta.title).toBe('ueditor.mindmap')
    expect(meta.icon).toBe('i-lucide-network')
    expect(meta.hasSettings).toBe(true)
  })

  it('renders the Render child component', async () => {
    const { default: MindmapIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/mindmap/index.vue'
    )
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))
    const wrapper = mount(MindmapIndex, {
      props: {
        node: { attrs: { content: '# Title' } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.mindmap-render-wrapper').exists()).toBe(true)
  })

  it('calls updateAttributes on config change', async () => {
    const { default: MindmapIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/mindmap/index.vue'
    )
    const updateAttributes = vi.fn()
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))
    const wrapper = mount(MindmapIndex, {
      props: {
        node: { attrs: { content: '' } },
        updateAttributes,
      },
      global: _globalConfig,
    })
    await flushPromises()
    const vm = wrapper.vm as any
    vm.onConfigChange('# New Content')
    await flushPromises()
    expect(updateAttributes).toHaveBeenCalledWith({ content: '# New Content' })
  })
})
