/**
 * race render not-started 组件测试
 * @see modules/lms/components/ueditor/extensions/nodes/vue/race/render/not-started.vue
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
  UButton: { template: '<button :disabled="disabled" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label', 'disabled'] },
  UIcon: { template: '<span />', props: ['name'] },
}

function makeMockContext(overrides: any = {}) {
  return {
    t: (k: string) => k,
    isTeacher: ref(true),
    raceQuestions: ref([1, 2, 3]),
    startRace: () => {},
    ...overrides,
  }
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('race/render/not-started.vue', () => {
  it('shows start button for teacher when questions exist', async () => {
    const { default: NotStarted } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/race/render/not-started.vue'
    )
    const ctx = makeMockContext({ isTeacher: ref(true) })
    const wrapper = mount(NotStarted, {
      global: { ..._globalConfig, provide: { [RaceRenderKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('race.start')
  })

  it('shows noQuestions for teacher when no questions', async () => {
    const { default: NotStarted } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/race/render/not-started.vue'
    )
    const ctx = makeMockContext({ isTeacher: ref(true), raceQuestions: ref([]) })
    const wrapper = mount(NotStarted, {
      global: { ..._globalConfig, provide: { [RaceRenderKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('race.noQuestions')
  })

  it('shows waiting message for student', async () => {
    const { default: NotStarted } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/race/render/not-started.vue'
    )
    const ctx = makeMockContext({ isTeacher: ref(false) })
    const wrapper = mount(NotStarted, {
      global: { ..._globalConfig, provide: { [RaceRenderKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('race.waiting')
  })
})
