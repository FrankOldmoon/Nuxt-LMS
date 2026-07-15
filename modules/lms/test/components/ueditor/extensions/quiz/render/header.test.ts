/**
 * quiz render header component test
 * @see modules/lms/components/ueditor/extensions/nodes/vue/quiz/render/header.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'
import { QuizRenderKey } from '../../../../../../components/ueditor/extensions/nodes/vue/quiz/useQuizRender'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  ueditorRender: { template: '<div class="ueditor-render" />', props: ['json'] },
  UButton: { template: '<button :disabled="disabled" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label', 'disabled'] },
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
    quiz: ref({ name: 'Test Quiz', point: 100, content: '', startAt: null, endAt: null }),
    quizId: ref(1),
    isTeacher: ref(false),
    moduleLms: true,
    editOpen: ref(false),
    recordsOpen: ref(false),
    userRecord: ref(null),
    started: ref(false),
    quizQuestions: ref([{ id: 1, point: 10 }]),
    canStart: ref(true),
    notStartedReason: ref(''),
    canRetry: ref(false),
    formatDateTime: (d: any) => String(d),
    startQuiz: () => {},
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

describe('quiz/render/header.vue', () => {
  it('renders quiz name and label', async () => {
    const { default: QuizHeader } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/quiz/render/header.vue'
    )
    const ctx = makeMockContext()
    const wrapper = mount(QuizHeader, {
      global: { ..._globalConfig, provide: { [QuizRenderKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('quiz.label')
    expect(wrapper.text()).toContain('Test Quiz')
  })

  it('shows start button when canStart and questions exist', async () => {
    const { default: QuizHeader } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/quiz/render/header.vue'
    )
    const ctx = makeMockContext({ started: ref(false), userRecord: ref(null), canStart: ref(true) })
    const wrapper = mount(QuizHeader, {
      global: { ..._globalConfig, provide: { [QuizRenderKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('quiz.start')
  })

  it('shows noQuestions when no questions', async () => {
    const { default: QuizHeader } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/quiz/render/header.vue'
    )
    const ctx = makeMockContext({ quizQuestions: ref([]) })
    const wrapper = mount(QuizHeader, {
      global: { ..._globalConfig, provide: { [QuizRenderKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('quiz.noQuestions')
  })

  it('shows user record when submitted', async () => {
    const { default: QuizHeader } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/quiz/render/header.vue'
    )
    const ctx = makeMockContext({ userRecord: ref({ score: 80, submitCount: 1 }) })
    const wrapper = mount(QuizHeader, {
      global: { ..._globalConfig, provide: { [QuizRenderKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('quiz.submitted')
    expect(wrapper.text()).toContain('80')
  })
})
