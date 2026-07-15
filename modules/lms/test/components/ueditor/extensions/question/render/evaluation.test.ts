/**
 * evaluation component test (render)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/render/evaluation.vue
 *
 * evaluation.vue uses AiChatbox global component, needs stub
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  UProgress: { template: '<div class="uprogress" />', props: ['modelValue'] },
  AiChatbox: { template: '<div class="ai-chatbox-stub" />', props: ['title', 'preset', 'opening', 'enableVoiceInput', 'enableVoiceOutput', 'heightClass'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  provide: {
    questionSubmitted: ref(false),
    questionIsCorrect: ref(false),
    questionFromRecord: ref(false),
  },
  mocks: { $t: (k: string, params?: any) => {
    if (params) {
      let s = k
      for (const [kk, v] of Object.entries(params)) s = s.replace(`{${kk}}`, String(v))
      return s
    }
    return k
  } },
}

describe('question/render/evaluation.vue', () => {
  const sampleQuestion = {
    type: 'evaluation',
    name: 'Evaluation question',
    options: { goal: 'Test goal', threshold: 0.8 },
    answer: [],
    point: 1,
    record: [],
    content: '',
  }

  it('mounts and renders goal text', async () => {
    const { default: EvaluationRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/evaluation.vue'
    )
    const wrapper = mount(EvaluationRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('Test goal')
  })

  it('renders progress bar', async () => {
    const { default: EvaluationRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/evaluation.vue'
    )
    const wrapper = mount(EvaluationRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.find('.uprogress').exists()).toBe(true)
  })

  it('exposes submit/reset/fillCorrectAnswer methods', async () => {
    const { default: EvaluationRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/evaluation.vue'
    )
    const wrapper = mount(EvaluationRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    const vm = wrapper.vm as any
    expect(typeof vm.submit).toBe('function')
    expect(typeof vm.reset).toBe('function')
    expect(typeof vm.fillCorrectAnswer).toBe('function')
  })
})
