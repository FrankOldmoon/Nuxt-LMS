/**
 * stepper/render.vue component test
 * @see modules/lms/components/ueditor/extensions/nodes/vue/stepper/render.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UStepper: { template: '<div class="ustepper-stub"><slot name="description" :item="{ description: \'\' }" /></div>', props: ['items', 'orientation'] },
  ueditorRender: { template: '<div class="ueditor-render-stub" />', props: ['json'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('stepper/render.vue', () => {
  it('mounts and renders stepper container', async () => {
    const { default: StepperRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/stepper/render.vue'
    )
    const wrapper = mount(StepperRender, {
      props: { node: { attrs: { content: JSON.stringify({ orientation: 'horizontal', steps: [] }) } } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.stepper-render-container').exists()).toBe(true)
  })

  it('passes steps to UStepper items', async () => {
    const { default: StepperRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/stepper/render.vue'
    )
    const wrapper = mount(StepperRender, {
      props: {
        node: {
          attrs: {
            content: JSON.stringify({
              orientation: 'vertical',
              steps: [
                { title: 'Step 1', description: 'desc 1' },
                { title: 'Step 2', description: 'desc 2' },
              ],
            }),
          },
        },
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.ustepper-stub').exists()).toBe(true)
  })

  it('uses horizontal orientation by default', async () => {
    const { default: StepperRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/stepper/render.vue'
    )
    const wrapper = mount(StepperRender, {
      props: { node: { attrs: { content: JSON.stringify({}) } } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.stepper-render-container').exists()).toBe(true)
  })
})
