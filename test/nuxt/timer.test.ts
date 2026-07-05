import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'

// Mock vue-i18n before importing the component
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

// Suppress Vue warnings about emit not being defined (pre-existing component bug)
const originalWarn = console.warn
vi.stubGlobal('console', {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
})

// Mock AudioContext
class MockAudioContext {
  createOscillator() {
    return {
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      frequency: { value: 0 },
      type: '',
    }
  }
  createGain() {
    return {
      connect: vi.fn(),
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
    }
  }
  get currentTime() { return 0 }
  get destination() { return {} }
}

// Import after mocks are set up
const Timer = await import('~/components/ueditor/render/nodes/vue/timer.vue').then(m => m.default)

function makeWrapper(nodeContent?: { minutes: number; seconds: number }) {
  return mount(Timer, {
    props: {
      node: {
        attrs: {
          content: nodeContent ? JSON.stringify(nodeContent) : undefined,
        },
      },
    },
    global: {
      mocks: {
        $t: (key: string) => key,
      },
    },
  })
}

describe('timer.vue (render)', () => {
  beforeEach(() => {
    vi.stubGlobal('AudioContext', MockAudioContext)
    vi.stubGlobal('webkitAudioContext', MockAudioContext)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('displays default 01:00 when no config', () => {
    const wrapper = makeWrapper()
    const text = wrapper.text()
    // Should show 01 minutes and 00 seconds
    expect(text).toMatch(/01/)
    expect(text).toMatch(/00/)
  })

  it('displays configured minutes and seconds', () => {
    const wrapper = makeWrapper({ minutes: 5, seconds: 30 })
    const text = wrapper.text()
    expect(text).toContain('05')
    expect(text).toContain('30')
  })

  it('pads single digit minutes with leading zero', () => {
    const wrapper = makeWrapper({ minutes: 3, seconds: 0 })
    expect(wrapper.text()).toContain('03')
  })

  it('pads single digit seconds with leading zero', () => {
    const wrapper = makeWrapper({ minutes: 0, seconds: 5 })
    expect(wrapper.text()).toContain('05')
  })

  it('adjusts minutes up on up button click', async () => {
    const wrapper = makeWrapper({ minutes: 5, seconds: 0 })
    const upBtn = wrapper.findAll('button')[0]
    await upBtn!.trigger('click')
    expect(wrapper.text()).toContain('06')
  })

  it('adjusts minutes down on down button click', async () => {
    const wrapper = makeWrapper({ minutes: 5, seconds: 0 })
    const downBtn = wrapper.findAll('button')[1]
    await downBtn!.trigger('click')
    expect(wrapper.text()).toContain('04')
  })

  it('does not allow minutes below 0', async () => {
    const wrapper = makeWrapper({ minutes: 0, seconds: 0 })
    const downBtn = wrapper.findAll('button')[1]
    await downBtn!.trigger('click')
    expect(wrapper.text()).toContain('00')
  })

  it('does not allow minutes above 180', async () => {
    const wrapper = makeWrapper({ minutes: 180, seconds: 0 })
    const upBtn = wrapper.findAll('button')[0]
    await upBtn!.trigger('click')
    expect(wrapper.text()).toContain('180')
  })

  it('adjusts seconds up on up button click', async () => {
    const wrapper = makeWrapper({ minutes: 0, seconds: 30 })
    const upBtn = wrapper.findAll('button')[2]
    await upBtn!.trigger('click')
    expect(wrapper.text()).toContain('31')
  })

  it('adjusts seconds down on down button click', async () => {
    const wrapper = makeWrapper({ minutes: 0, seconds: 30 })
    const downBtn = wrapper.findAll('button')[3]
    await downBtn!.trigger('click')
    expect(wrapper.text()).toContain('29')
  })

  it('borrows from minutes when seconds go below 0', async () => {
    const wrapper = makeWrapper({ minutes: 2, seconds: 0 })
    const downBtn = wrapper.findAll('button')[3]
    await downBtn!.trigger('click')
    const text = wrapper.text()
    expect(text).toContain('01')
    expect(text).toContain('59')
  })

  it('does not borrow when minutes are 0', async () => {
    const wrapper = makeWrapper({ minutes: 0, seconds: 0 })
    const downBtn = wrapper.findAll('button')[3]
    await downBtn!.trigger('click')
    const text = wrapper.text()
    expect(text).toContain('00')
  })

  it('carries to minutes when seconds go above 59', async () => {
    const wrapper = makeWrapper({ minutes: 0, seconds: 59 })
    const upBtn = wrapper.findAll('button')[2]
    await upBtn!.trigger('click')
    const text = wrapper.text()
    expect(text).toContain('01')
    expect(text).toContain('00')
  })

  it('does not carry when minutes are at 180', async () => {
    const wrapper = makeWrapper({ minutes: 180, seconds: 59 })
    const upBtn = wrapper.findAll('button')[2]
    await upBtn!.trigger('click')
    const text = wrapper.text()
    expect(text).toContain('180')
    expect(text).toContain('59')
  })

  it('starts timer and counts down', async () => {
    const wrapper = makeWrapper({ minutes: 0, seconds: 3 })
    const playBtn = wrapper.findAll('button')[4]
    await playBtn!.trigger('click')
    vi.advanceTimersByTime(1000)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('02')
  })

  it('timer reaches done state when time runs out', async () => {
    const wrapper = makeWrapper({ minutes: 0, seconds: 1 })
    const playBtn = wrapper.findAll('button')[4]
    await playBtn!.trigger('click')
    vi.advanceTimersByTime(2000)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('00')
  })

  it('resets timer on reset button click', async () => {
    const wrapper = makeWrapper({ minutes: 5, seconds: 30 })
    const playBtn = wrapper.findAll('button')[4]
    await playBtn!.trigger('click')
    vi.advanceTimersByTime(2000)
    await wrapper.vm.$nextTick()
    const resetBtn = wrapper.findAll('button').slice(-1)[0]
    await resetBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('05')
    expect(wrapper.text()).toContain('30')
  })

  it('disables adjust buttons when timer is running', async () => {
    const wrapper = makeWrapper({ minutes: 0, seconds: 5 })
    const playBtn = wrapper.findAll('button')[4]
    await playBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    const buttons = wrapper.findAll('button')
    expect(buttons[0]!.attributes('disabled')).toBeDefined()
    expect(buttons[1]!.attributes('disabled')).toBeDefined()
    expect(buttons[2]!.attributes('disabled')).toBeDefined()
    expect(buttons[3]!.attributes('disabled')).toBeDefined()
  })
})
