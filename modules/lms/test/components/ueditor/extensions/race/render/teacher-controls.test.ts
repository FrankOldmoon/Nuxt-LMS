/**
 * race render teacher-controls 组件测试
 * @see modules/lms/components/ueditor/extensions/nodes/vue/race/render/teacher-controls.vue
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
}

function makeMockContext(overrides: any = {}) {
  return {
    t: (k: string) => k,
    raceQuestions: ref([1, 2, 3]),
    currentIndex: ref(0),
    currentQuestionCid: ref(0),
    endRace: () => {},
    endQuestion: () => {},
    nextQuestion: () => {},
    ...overrides,
  }
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('race/render/teacher-controls.vue', () => {
  it('renders end race button', async () => {
    const { default: TeacherControls } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/race/render/teacher-controls.vue'
    )
    const ctx = makeMockContext()
    const wrapper = mount(TeacherControls, {
      global: { ..._globalConfig, provide: { [RaceRenderKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('race.end')
  })

  it('shows next button when no current question', async () => {
    const { default: TeacherControls } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/race/render/teacher-controls.vue'
    )
    const ctx = makeMockContext({ currentQuestionCid: ref(0) })
    const wrapper = mount(TeacherControls, {
      global: { ..._globalConfig, provide: { [RaceRenderKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('race.next')
  })

  it('shows showResult button when currentQuestionCid is set', async () => {
    const { default: TeacherControls } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/race/render/teacher-controls.vue'
    )
    const ctx = makeMockContext({ currentQuestionCid: ref(5) })
    const wrapper = mount(TeacherControls, {
      global: { ..._globalConfig, provide: { [RaceRenderKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('race.showResult')
  })

  it('shows question progress', async () => {
    const { default: TeacherControls } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/race/render/teacher-controls.vue'
    )
    const ctx = makeMockContext({ currentIndex: ref(1), raceQuestions: ref([1, 2, 3]) })
    const wrapper = mount(TeacherControls, {
      global: { ..._globalConfig, provide: { [RaceRenderKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('2 / 3')
  })
})
