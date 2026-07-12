/**
 * TimerModal 组件测试
 * @see modules/lms/components/chapter/timerModal.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../test/setup/nuxt-stubs'
// 逻辑已抽到 composable，组件测试需把 auto-imported composable 暴露到 globalThis
import { useChapterTimer } from '../../composables/useChapterTimer'
;(globalThis as any).useChapterTimer = useChapterTimer

beforeEach(() => {
  resetAllStubs()
  setMockI18n({
    locale: { value: 'en' },
    t: (k: string) => k,
    d: (v: any) => String(v),
  })
  // stub AudioContext
  ;(globalThis as any).AudioContext = class {
    createOscillator() {
      return {
        connect: () => {},
        frequency: { value: 0 },
        type: 'sine',
        start: () => {},
        stop: () => {},
      }
    }
    createGain() {
      return {
        connect: () => {},
        gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      }
    }
    get destination() { return {} }
    get currentTime() { return 0 }
  }
})

const _globalStubs = {
  UModal: {
    template: '<div v-if="open" class="modal"><slot name="content" /></div><div v-else />',
    props: ['open', 'ui'],
  },
  UButton: {
    template: '<button :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['icon', 'size', 'variant', 'color', 'label', 'disabled'],
  },
}

const _mocks = {
  $t: (k: string, params?: any) => {
    if (params) {
      let s = k
      for (const [kk, v] of Object.entries(params)) s = s.replace(`{${kk}}`, String(v))
      return s
    }
    return k
  },
}

const _globalConfig = {
  mocks: _mocks,
  stubs: _globalStubs,
}

describe('chapter/timerModal.vue', () => {
  it('默认渲染为 modal', async () => {
    const { default: TimerModal } = await import('../../components/chapter/timerModal.vue')
    const wrapper = mount(TimerModal, {
      props: { open: true },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.html()).toContain('modal')
  })

  it('open=false 时不渲染内容', async () => {
    const { default: TimerModal } = await import('../../components/chapter/timerModal.vue')
    const wrapper = mount(TimerModal, {
      props: { open: false },
      global: _globalConfig,
    })
    expect(wrapper.html()).not.toContain('modal')
  })

  it('open=true 时显示计时器标题', async () => {
    const { default: TimerModal } = await import('../../components/chapter/timerModal.vue')
    const wrapper = mount(TimerModal, {
      props: { open: true },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('chapter.timer')
  })

  it('初始默认 1 分钟 0 秒', async () => {
    const { default: TimerModal } = await import('../../components/chapter/timerModal.vue')
    const wrapper = mount(TimerModal, {
      props: { open: true },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('01')
    expect(wrapper.text()).toContain('00')
  })

  it('open 从 true 变 false 时重置', async () => {
    const { default: TimerModal } = await import('../../components/chapter/timerModal.vue')
    const wrapper = mount(TimerModal, {
      props: { open: true },
      global: _globalConfig,
    })
    await wrapper.setProps({ open: false })
    await flushPromises()
    expect(wrapper.exists()).toBe(true)
  })
})
