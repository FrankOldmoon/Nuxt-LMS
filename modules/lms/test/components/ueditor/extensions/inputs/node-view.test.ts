/**
 * inputs/node-view component test (TipTap node-view)
 * @see modules/lms/components/ueditor/extensions/nodes/inputs/node-view.vue
 *
 * Simple UInput binding with NodeViewWrapper + nodeViewProps
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  NodeViewWrapper: { template: '<div class="node-view-wrapper"><slot /></div>' },
  UInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'placeholder', 'size'],
  },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('inputs/node-view.vue', () => {
  it('mounts and renders an input with initial content', async () => {
    const { default: InputNodeView } = await import(
      '../../../../../components/ueditor/extensions/nodes/inputs/node-view.vue'
    )
    const wrapper = mount(InputNodeView, {
      props: {
        node: { attrs: { content: 'hello world' } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('input').exists()).toBe(true)
    expect(wrapper.find('input').element.value).toBe('hello world')
  })

  it('calls updateAttributes when input value changes', async () => {
    const { default: InputNodeView } = await import(
      '../../../../../components/ueditor/extensions/nodes/inputs/node-view.vue'
    )
    const updateAttributes = vi.fn()
    const wrapper = mount(InputNodeView, {
      props: {
        node: { attrs: { content: '' } },
        updateAttributes,
      },
      global: _globalConfig,
    })
    await flushPromises()
    const input = wrapper.find('input')
    await input.setValue('new value')
    await flushPromises()
    expect(updateAttributes).toHaveBeenCalledWith({ content: 'new value' })
  })

  it('renders without errors when content is undefined', async () => {
    const { default: InputNodeView } = await import(
      '../../../../../components/ueditor/extensions/nodes/inputs/node-view.vue'
    )
    const wrapper = mount(InputNodeView, {
      props: {
        node: { attrs: {} },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('input').exists()).toBe(true)
  })
})
