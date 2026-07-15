/**
 * stepper/index.vue component test (TipTap node-view)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/stepper/index.vue
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
  UStepper: { template: '<div class="ustepper-stub"><slot /></div>', props: ['items', 'orientation'] },
  ueditorRender: { template: '<div class="ueditor-render-stub" />', props: ['json'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('stepper/index.vue', () => {
  it('mounts and sets meta title/icon/hasSettings', async () => {
    const { default: StepperIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/stepper/index.vue'
    )
    const meta = reactive({ title: '', icon: '', hasSettings: false })
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', meta)
    const wrapper = mount(StepperIndex, {
      props: {
        node: { attrs: { content: JSON.stringify({ orientation: 'horizontal', steps: [] }) } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(meta.title).toBe('ueditor.stepper')
    expect(meta.icon).toBe('i-lucide-steps')
    expect(meta.hasSettings).toBe(true)
  })

  it('calls updateAttributes on config change', async () => {
    const { default: StepperIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/stepper/index.vue'
    )
    const updateAttributes = vi.fn()
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))
    const wrapper = mount(StepperIndex, {
      props: {
        node: { attrs: { content: '' } },
        updateAttributes,
      },
      global: _globalConfig,
    })
    await flushPromises()
    const vm = wrapper.vm as any
    vm.onConfigChange({ orientation: 'vertical', steps: [{ title: 'A', description: '' }] })
    await flushPromises()
    expect(updateAttributes).toHaveBeenCalledWith({ content: JSON.stringify({ orientation: 'vertical', steps: [{ title: 'A', description: '' }] }) })
  })
})
