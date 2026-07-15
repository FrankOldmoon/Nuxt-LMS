/**
 * race render podium component test
 * @see modules/lms/components/ueditor/extensions/nodes/vue/race/render/podium.vue
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
  UAvatar: { template: '<div class="uavatar">{{ text }}</div>', props: ['src', 'alt', 'size', 'text'] },
  UIcon: { template: '<span />', props: ['name'] },
}

function makeMockContext(overrides: any = {}) {
  return {
    t: (k: string) => k,
    raceActive: ref(false),
    questionTop3: ref([]),
    ...overrides,
  }
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('race/render/podium.vue', () => {
  it('shows noWinners when questionTop3 is empty', async () => {
    const { default: Podium } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/race/render/podium.vue'
    )
    const ctx = makeMockContext({ questionTop3: ref([]) })
    const wrapper = mount(Podium, {
      global: { ..._globalConfig, provide: { [RaceRenderKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('race.noWinners')
  })

  it('shows leaderboard title when race not active', async () => {
    const { default: Podium } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/race/render/podium.vue'
    )
    const ctx = makeMockContext({ raceActive: ref(false) })
    const wrapper = mount(Podium, {
      global: { ..._globalConfig, provide: { [RaceRenderKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('race.leaderboard')
  })

  it('shows results title when race active', async () => {
    const { default: Podium } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/race/render/podium.vue'
    )
    const ctx = makeMockContext({ raceActive: ref(true) })
    const wrapper = mount(Podium, {
      global: { ..._globalConfig, provide: { [RaceRenderKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('race.results')
  })

  it('renders top 3 winners', async () => {
    const { default: Podium } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/race/render/podium.vue'
    )
    const top3 = [
      { from: 'Alice', timeUsed: 10, avatarImg: null },
      { from: 'Bob', timeUsed: 15, avatarImg: null },
      { from: 'Carol', timeUsed: 20, avatarImg: null },
    ]
    const ctx = makeMockContext({ questionTop3: ref(top3) })
    const wrapper = mount(Podium, {
      global: { ..._globalConfig, provide: { [RaceRenderKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('Bob')
    expect(wrapper.text()).toContain('Carol')
  })
})
