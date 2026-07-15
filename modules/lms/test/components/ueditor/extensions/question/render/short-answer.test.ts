/**
 * short-answer component test (render)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/render/short-answer.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalConfig = {
  stubs: {},
  provide: {
    questionSubmitted: ref(false),
    questionIsCorrect: ref(false),
    questionFromRecord: ref(false),
  },
  mocks: { $t: (k: string) => k },
}

describe('question/render/short-answer.vue', () => {
  const sampleQuestion = {
    type: 'short-answer',
    name: 'Short answer question',
    answer: ['hello.*'],
    options: [],
    point: 1,
    record: [],
    content: '',
  }

  it('mounts and renders textarea', async () => {
    const { default: ShortAnswerRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/short-answer.vue'
    )
    const wrapper = mount(ShortAnswerRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('updates record on input', async () => {
    const { default: ShortAnswerRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/short-answer.vue'
    )
    const wrapper = mount(ShortAnswerRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('hello world')
    expect(sampleQuestion.record).toEqual(['hello world'])
  })

  it('exposes submit/reset/fillCorrectAnswer methods', async () => {
    const { default: ShortAnswerRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/short-answer.vue'
    )
    const wrapper = mount(ShortAnswerRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    const vm = wrapper.vm as any
    expect(typeof vm.submit).toBe('function')
    expect(typeof vm.reset).toBe('function')
    expect(typeof vm.fillCorrectAnswer).toBe('function')
  })
})
