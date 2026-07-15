/**
 * select/node-view component test (TipTap node-view)
 * @see modules/lms/components/ueditor/extensions/nodes/select/node-view.vue
 *
 * Native <select> with options from injected questionForm, uses NodeViewWrapper + nodeViewProps + useI18n
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n, provide } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  NodeViewWrapper: { template: '<div class="node-view-wrapper"><slot /></div>' },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('select/node-view.vue', () => {
  it('mounts and renders a select with options from questionForm', async () => {
    const { default: SelectNodeView } = await import(
      '../../../../../components/ueditor/extensions/nodes/select/node-view.vue'
    )
    provide('questionForm', ref({ options: ['A', 'B', 'C'] }))
    const wrapper = mount(SelectNodeView, {
      props: {
        node: { attrs: { content: '' } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    const select = wrapper.find('select')
    expect(select.exists()).toBe(true)
    const options = select.findAll('option')
    // 1 disabled placeholder + 3 options = 4
    expect(options.length).toBe(4)
    expect(options[1].text()).toBe('A')
    expect(options[2].text()).toBe('B')
    expect(options[3].text()).toBe('C')
  })

  it('calls updateAttributes when selection changes', async () => {
    const { default: SelectNodeView } = await import(
      '../../../../../components/ueditor/extensions/nodes/select/node-view.vue'
    )
    const updateAttributes = vi.fn()
    provide('questionForm', ref({ options: ['X', 'Y'] }))
    const wrapper = mount(SelectNodeView, {
      props: {
        node: { attrs: { content: '' } },
        updateAttributes,
      },
      global: _globalConfig,
    })
    await flushPromises()
    const select = wrapper.find('select')
    await select.setValue('Y')
    await flushPromises()
    expect(updateAttributes).toHaveBeenCalledWith({ content: 'Y' })
  })

  it('shows placeholder text when no options available', async () => {
    const { default: SelectNodeView } = await import(
      '../../../../../components/ueditor/extensions/nodes/select/node-view.vue'
    )
    const wrapper = mount(SelectNodeView, {
      props: {
        node: { attrs: { content: '' } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    const select = wrapper.find('select')
    expect(select.exists()).toBe(true)
    // No questionForm provided → options empty → placeholder shown
    const placeholderOption = select.find('option')
    expect(placeholderOption.exists()).toBe(true)
    expect(placeholderOption.text()).toContain('selectNode.dropdown')
  })
})
