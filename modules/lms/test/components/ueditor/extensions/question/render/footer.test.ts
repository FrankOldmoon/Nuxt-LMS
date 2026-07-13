/**
 * footer 组件测试 (render)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/render/footer.vue
 *
 * footer.vue 使用 useQuestionRenderContext() (Vue inject from 'vue') + inject('inQuiz') (auto-import global stub)
 * 需要同时 provide QuestionRenderKey (via Vue provide) 和 inQuiz (via global provide Map)
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed, defineComponent, h, provide as vueProvide } from 'vue'
import { resetAllStubs, setMockI18n, provide as globalProvide } from '../../../../../../../../test/setup/nuxt-stubs'
import { QuestionRenderKey } from '../../../../../../components/ueditor/extensions/nodes/vue/question/useQuestionRender'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UButton: { template: '<button @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['variant', 'size', 'color', 'disabled', 'icon', 'label'] },
  ResultBanner: { template: '<div class="result-banner" />', props: ['correct', 'point'] },
  ExplanationBlock: { template: '<div class="explanation-block" />', props: ['explanation'] },
}

function makeRenderCtx(overrides: any = {}) {
  const question = ref({ tags: ['tag1'], point: 5, explanation: 'some explanation', ...overrides.question })
  const submitted = ref(overrides.submitted ?? false)
  const isCorrect = ref(overrides.isCorrect ?? false)
  const showAnswer = ref(overrides.showAnswer ?? false)
  const hasAnswer = ref(overrides.hasAnswer ?? true)
  const isTeacher = ref(overrides.isTeacher ?? false)
  const formattedAnswers = computed(() => overrides.formattedAnswers ?? ['A'])
  return {
    t: (k: string) => k,
    question,
    isTeacher,
    submitted,
    isCorrect,
    showAnswer,
    hasAnswer,
    formattedAnswers,
    onSubmit: () => {},
    onReset: () => {},
    onShowAnswer: () => {},
    ...overrides,
  }
}

/** Wrapper component that provides the QuestionRenderKey via Vue's provide */
function makeProvider(inQuiz: boolean = false) {
  // Also set inQuiz in the global provide Map (for footer's auto-imported inject)
  globalProvide('inQuiz', inQuiz)
  return defineComponent({
    setup(_, { slots }) {
      vueProvide(QuestionRenderKey, makeRenderCtx())
      return () => slots.default?.()
    },
  })
}

const _mocks = { $t: (k: string) => k }

describe('question/render/footer.vue', () => {
  it('mounts and renders submit/reset buttons', async () => {
    const { default: Footer } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/footer.vue'
    )
    const Provider = makeProvider(false)
    const wrapper = mount({
      render() {
        return h(Provider, () => h(Footer))
      },
    }, { global: { stubs: _globalStubs, mocks: _mocks } })
    expect(wrapper.text()).toContain('common.reset')
    expect(wrapper.text()).toContain('question.submit')
  })

  it('renders tags when present', async () => {
    const { default: Footer } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/footer.vue'
    )
    const Provider = makeProvider(false)
    const wrapper = mount({
      render() {
        return h(Provider, () => h(Footer))
      },
    }, { global: { stubs: _globalStubs, mocks: _mocks } })
    expect(wrapper.text()).toContain('tag1')
  })

  it('hides submit/reset when inQuiz=true', async () => {
    const { default: Footer } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/footer.vue'
    )
    const Provider = makeProvider(true)
    const wrapper = mount({
      render() {
        return h(Provider, () => h(Footer))
      },
    }, { global: { stubs: _globalStubs, mocks: _mocks } })
    expect(wrapper.text()).not.toContain('question.submit')
  })
})
