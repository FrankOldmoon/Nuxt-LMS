/**
 * timer/render.vue 组件测试
 * @see modules/lms/components/ueditor/extensions/nodes/vue/timer/render.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

// Stub AudioContext for timer beep
;(globalThis as any).AudioContext = class {
  createOscillator() {
    return { connect: () => {}, frequency: { value: 0 }, type: 'sine', start: () => {}, stop: () => {} }
  }
  createGain() {
    return { connect: () => {}, gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} } }
  }
  get destination() { return {} }
  get currentTime() { return 0 }
}

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

describe('timer/render.vue', () => {
  it('mounts and displays minutes:seconds from config', async () => {
    const { default: TimerRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/timer/render.vue'
    )
    const wrapper = mount(TimerRender, {
      props: { node: { attrs: { content: JSON.stringify({ minutes: 5, seconds: 30 }) } } },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('05')
    expect(wrapper.text()).toContain('30')
  })

  it('defaults to 1:00 when no config', async () => {
    const { default: TimerRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/timer/render.vue'
    )
    const wrapper = mount(TimerRender, {
      props: { node: { attrs: {} } },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('01')
    expect(wrapper.text()).toContain('00')
  })

  it('emits update when adjustMinutes is called via button', async () => {
    const { default: TimerRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/timer/render.vue'
    )
    const wrapper = mount(TimerRender, {
      props: { node: { attrs: { content: JSON.stringify({ minutes: 5, seconds: 0 }) } } },
      global: _globalConfig,
    })
    // First button is the "+" for minutes (chevron-up)
    const buttons = wrapper.findAll('button')
    // Click the first chevron-up button (increase minutes)
    await buttons[0].trigger('click')
    const updateEvents = wrapper.emitted('update')
    expect(updateEvents).toBeTruthy()
    expect(updateEvents![0][0]).toEqual({ minutes: 6, seconds: 0 })
  })
})
