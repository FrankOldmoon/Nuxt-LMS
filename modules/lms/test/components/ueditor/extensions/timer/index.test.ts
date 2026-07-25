/**
 * timer/index.vue 组件测试 (TipTap node-view)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/timer/index.vue
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, reactive } from 'vue'
import { resetAllStubs, setMockI18n, provide } from '../../../../../../../test/setup/nuxt-stubs'

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
  UFormField: { template: '<div class="uform-field"><slot /></div>', props: ['label', 'size'] },
  UInput: { template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'type', 'placeholder', 'size', 'min', 'max'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('timer/index.vue', () => {
  it('mounts and sets meta title/icon/hasSettings', async () => {
    const { default: TimerIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/timer/index.vue'
    )
    const meta = reactive({ title: '', icon: '', hasSettings: false })
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', meta)
    const wrapper = mount(TimerIndex, {
      props: {
        node: { attrs: { content: JSON.stringify({ minutes: 5, seconds: 30 }) } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(meta.title).toBe('chapter.timer')
    expect(meta.icon).toBe('i-lucide-timer')
    expect(meta.hasSettings).toBe(true)
  })

  it('uses default 1min 0sec when content is empty', async () => {
    const { default: TimerIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/timer/index.vue'
    )
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))
    const wrapper = mount(TimerIndex, {
      props: {
        node: { attrs: { content: '' } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    // Display should show 01:00 (1 minute, 0 seconds)
    expect(wrapper.text()).toContain('01')
  })

  it('calls updateAttributes on config change', async () => {
    const { default: TimerIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/timer/index.vue'
    )
    const updateAttributes = vi.fn()
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))
    const wrapper = mount(TimerIndex, {
      props: {
        node: { attrs: { content: '' } },
        updateAttributes,
      },
      global: _globalConfig,
    })
    await flushPromises()
    const vm = wrapper.vm as any
    vm.onConfigChange({ minutes: 10, seconds: 0 })
    await flushPromises()
    expect(updateAttributes).toHaveBeenCalledWith({ content: JSON.stringify({ minutes: 10, seconds: 0 }) })
  })

  it('calls updateAttributes on render update', async () => {
    const { default: TimerIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/timer/index.vue'
    )
    const updateAttributes = vi.fn()
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))
    const wrapper = mount(TimerIndex, {
      props: {
        node: { attrs: { content: '' } },
        updateAttributes,
      },
      global: _globalConfig,
    })
    await flushPromises()
    const vm = wrapper.vm as any
    vm.onRenderUpdate({ minutes: 2, seconds: 30 })
    await flushPromises()
    expect(updateAttributes).toHaveBeenCalledWith({ content: JSON.stringify({ minutes: 2, seconds: 30 }) })
  })
})
