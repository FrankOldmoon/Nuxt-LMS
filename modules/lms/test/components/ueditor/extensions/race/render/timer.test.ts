/**
 * race render timer component test
 * @see modules/lms/components/ueditor/extensions/nodes/vue/race/render/timer.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'
import { RaceRenderKey } from '../../../../../../components/ueditor/extensions/nodes/vue/race/useRaceRender'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UIcon: { template: '<span />', props: ['name'] },
}

function makeMockContext(overrides: any = {}) {
  return {
    t: (k: string, params?: any) => {
      if (params) {
        let s = k
        for (const [kk, v] of Object.entries(params)) s = s.replace(`{${kk}}`, String(v))
        return s
      }
      return k
    },
    timeRemaining: ref(60),
    formatTime: (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`,
    timeProgress: ref(50),
    currentIndex: ref(0),
    raceQuestions: ref([1, 2, 3]),
    ...overrides,
  }
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string, params?: any) => {
    if (params) {
      let s = k
      for (const [kk, v] of Object.entries(params)) s = s.replace(`{${kk}}`, String(v))
      return s
    }
    return k
  } },
}

describe('race/render/timer.vue', () => {
  it('renders formatted time', async () => {
    const { default: RaceTimer } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/race/render/timer.vue'
    )
    const ctx = makeMockContext({ timeRemaining: ref(120) })
    const wrapper = mount(RaceTimer, {
      global: { ..._globalConfig, provide: { [RaceRenderKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('2:00')
  })

  it('renders question index info', async () => {
    const { default: RaceTimer } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/race/render/timer.vue'
    )
    const ctx = makeMockContext({ currentIndex: ref(1), raceQuestions: ref([1, 2, 3]) })
    const wrapper = mount(RaceTimer, {
      global: { ..._globalConfig, provide: { [RaceRenderKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('race.questionIndex')
  })

  it('applies red styling when timeRemaining <= 5', async () => {
    const { default: RaceTimer } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/race/render/timer.vue'
    )
    const ctx = makeMockContext({ timeRemaining: ref(3) })
    const wrapper = mount(RaceTimer, {
      global: { ..._globalConfig, provide: { [RaceRenderKey as any]: ctx } },
    })
    expect(wrapper.html()).toContain('text-red-500')
  })
})
