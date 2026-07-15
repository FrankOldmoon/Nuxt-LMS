/**
 * quiz render questionsArea component test
 * @see modules/lms/components/ueditor/extensions/nodes/vue/quiz/render/questionsArea.vue
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
  UButton: { template: '<button :disabled="disabled" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label', 'loading', 'disabled'] },
  UIcon: { template: '<span />', props: ['name'] },
  UModal: {
    template: '<div v-if="open" class="modal-stub"><slot name="content" /></div>',
    props: ['open'],
  },
  // Stub QuestionRender to avoid loading the full question component tree
  QuestionRender: { template: '<div class="question-render-stub">Q#{{ node?.attrs?.content }}</div>', props: ['node', 'courseId', 'inQuiz'] },
}

function makeMockContext(overrides: any = {}) {
  return {
    t: (k: string) => k,
    effectiveCourseId: ref(1),
    started: ref(true),
    remainingTime: ref(120),
    formatTime: (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`,
    timeProgress: ref(50),
    quizQuestions: ref([{ id: 1, point: 10 }, { id: 2, point: 5 }]),
    getQuestionBtnClass: () => '',
    switchQuestion: () => {},
    currentIndex: ref(0),
    questionRefs: [],
    answeredCount: ref(1),
    submitting: ref(false),
    confirmOpen: ref(false),
    confirmSubmit: () => {},
    submitQuiz: () => {},
    ...overrides,
  }
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('quiz/render/questionsArea.vue', () => {
  it('renders timer when started', async () => {
    const { default: QuestionsArea } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/quiz/render/questionsArea.vue'
    )
    const ctx = makeMockContext({ started: ref(true) })
    const wrapper = mount(QuestionsArea, {
      global: { ..._globalConfig, provide: { [QuizRenderKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('quiz.timeRemaining')
  })

  it('renders question navigation buttons', async () => {
    const { default: QuestionsArea } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/quiz/render/questionsArea.vue'
    )
    const ctx = makeMockContext({ started: ref(true) })
    const wrapper = mount(QuestionsArea, {
      global: { ..._globalConfig, provide: { [QuizRenderKey as any]: ctx } },
    })
    const navButtons = wrapper.findAll('button').filter(b => /^\d+$/.test(b.text().trim()))
    expect(navButtons.length).toBeGreaterThanOrEqual(2)
  })

  it('renders submit button when started', async () => {
    const { default: QuestionsArea } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/quiz/render/questionsArea.vue'
    )
    const ctx = makeMockContext({ started: ref(true) })
    const wrapper = mount(QuestionsArea, {
      global: { ..._globalConfig, provide: { [QuizRenderKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('quiz.submit')
  })

  it('shows answered count', async () => {
    const { default: QuestionsArea } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/quiz/render/questionsArea.vue'
    )
    const ctx = makeMockContext({ started: ref(true), answeredCount: ref(1) })
    const wrapper = mount(QuestionsArea, {
      global: { ..._globalConfig, provide: { [QuizRenderKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('1 / 2')
  })
})
