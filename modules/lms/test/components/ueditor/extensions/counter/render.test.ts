/**
 * counter/render.vue 组件测试
 * @see modules/lms/components/ueditor/extensions/nodes/vue/counter/render.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

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

describe('counter/render.vue', () => {
  it('mounts and displays initial count from node', async () => {
    const { default: CounterRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/counter/render.vue'
    )
    const wrapper = mount(CounterRender, {
      props: { node: { attrs: { content: '5' } } },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('5')
  })

  it('defaults to 0 when content is empty', async () => {
    const { default: CounterRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/counter/render.vue'
    )
    const wrapper = mount(CounterRender, {
      props: { node: { attrs: {} } },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('0')
  })

  it('increments count and emits update on plus click', async () => {
    const { default: CounterRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/counter/render.vue'
    )
    const wrapper = mount(CounterRender, {
      props: { node: { attrs: { content: '0' } } },
      global: _globalConfig,
    })
    // The second button is the plus button (after minus)
    const buttons = wrapper.findAll('button')
    const plusBtn = buttons[1]
    await plusBtn.trigger('click')
    const updateEvents = wrapper.emitted('update')
    expect(updateEvents).toBeTruthy()
    expect(updateEvents![0][0]).toBe('1')
  })

  it('decrements count and emits update on minus click', async () => {
    const { default: CounterRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/counter/render.vue'
    )
    const wrapper = mount(CounterRender, {
      props: { node: { attrs: { content: '3' } } },
      global: _globalConfig,
    })
    const buttons = wrapper.findAll('button')
    const minusBtn = buttons[0]
    await minusBtn.trigger('click')
    const updateEvents = wrapper.emitted('update')
    expect(updateEvents).toBeTruthy()
    expect(updateEvents![0][0]).toBe('2')
  })

  it('does not decrement below 0', async () => {
    const { default: CounterRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/counter/render.vue'
    )
    const wrapper = mount(CounterRender, {
      props: { node: { attrs: { content: '0' } } },
      global: _globalConfig,
    })
    const buttons = wrapper.findAll('button')
    const minusBtn = buttons[0]
    await minusBtn.trigger('click')
    expect(wrapper.emitted('update')).toBeFalsy()
  })
})
