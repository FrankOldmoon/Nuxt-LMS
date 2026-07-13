/**
 * counter/index.vue 组件测试 (TipTap node-view)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/counter/index.vue
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
  UButton: { template: '<button :disabled="disabled" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'disabled'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('counter/index.vue', () => {
  it('mounts and sets meta hasSettings=false', async () => {
    const { default: CounterIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/counter/index.vue'
    )
    const meta = reactive({ title: '', icon: '', hasSettings: true })
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', meta)
    const wrapper = mount(CounterIndex, {
      props: {
        node: { attrs: { content: '5' } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(meta.hasSettings).toBe(false)
  })

  it('calls updateAttributes when render emits update', async () => {
    const { default: CounterIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/counter/index.vue'
    )
    const updateAttributes = vi.fn()
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))
    const wrapper = mount(CounterIndex, {
      props: {
        node: { attrs: { content: '0' } },
        updateAttributes,
      },
      global: _globalConfig,
    })
    await flushPromises()
    const vm = wrapper.vm as any
    vm.onRenderUpdate('3')
    await flushPromises()
    expect(updateAttributes).toHaveBeenCalledWith({ content: '3' })
  })
})
