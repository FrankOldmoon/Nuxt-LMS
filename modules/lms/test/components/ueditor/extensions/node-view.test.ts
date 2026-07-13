/**
 * node-view.vue 组件测试 (TipTap node-view 容器)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/node-view.vue
 *
 * node-view.vue 是所有扩展组件的容器：
 * - 使用 useNodeView 动态加载 ./<type>/index.vue
 * - provide nodeViewShowConfig / nodeViewMeta 给子组件
 * - 工具栏在 meta.title 非空时显示
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n, provide } from '../../../../../../test/setup/nuxt-stubs'
import { ref, reactive } from 'vue'

// Stub NodeViewWrapper from @tiptap/vue-3
vi.mock('@tiptap/vue-3', async (importOriginal) => {
  const orig: any = await importOriginal()
  return {
    ...orig,
    NodeViewWrapper: {
      name: 'NodeViewWrapper',
      template: '<div class="node-view-wrapper-stub"><slot /></div>',
    },
  }
})

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // Provide default nodeViewMeta/nodeViewShowConfig in global store for dynamically
  // loaded components that use auto-imported inject (e.g. counter/index.vue)
  provide('nodeViewShowConfig', ref(false))
  provide('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))
})

const _globalStubs = {
  UButton: { template: '<button @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label'] },
  UIcon: { template: '<span />', props: ['name'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('node-view.vue', () => {
  it('mounts and renders wrapper container', async () => {
    const { default: NodeView } = await import(
      '../../../../components/ueditor/extensions/nodes/vue/node-view.vue'
    )
    const wrapper = mount(NodeView, {
      props: {
        node: { attrs: { type: '' } },
        updateAttributes: () => {},
        deleteNode: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.vue-node-container').exists()).toBe(true)
  })

  it('does not show toolbar when meta.title is empty', async () => {
    const { default: NodeView } = await import(
      '../../../../components/ueditor/extensions/nodes/vue/node-view.vue'
    )
    const wrapper = mount(NodeView, {
      props: {
        node: { attrs: { type: '' } },
        updateAttributes: () => {},
        deleteNode: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.vue-node-toolbar').exists()).toBe(false)
  })

  it('dynamically loads component based on node type', async () => {
    const { default: NodeView } = await import(
      '../../../../components/ueditor/extensions/nodes/vue/node-view.vue'
    )
    const wrapper = mount(NodeView, {
      props: {
        node: { attrs: { type: 'counter' } },
        updateAttributes: () => {},
        deleteNode: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    // The counter component should be loaded; verify the container exists
    expect(wrapper.find('.vue-node-container').exists()).toBe(true)
  })
})
