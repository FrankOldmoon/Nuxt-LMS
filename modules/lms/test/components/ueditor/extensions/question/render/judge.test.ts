/**
 * judge component test (render)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/render/judge.vue
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

describe('question/render/judge.vue', () => {
  const sampleQuestion = {
    type: 'judge',
    name: 'Judge question',
    options: ['Correct', 'Wrong'],
    answer: [0],
    point: 1,
    record: [],
    content: '',
  }

  it('mounts and renders two judge buttons', async () => {
    const { default: JudgeRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/judge.vue'
    )
    const wrapper = mount(JudgeRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBe(2)
  })

  it('selects an answer on click', async () => {
    const { default: JudgeRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/judge.vue'
    )
    const wrapper = mount(JudgeRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    expect(sampleQuestion.record).toEqual([0])
  })

  it('submit returns correct result when answer matches', async () => {
    const { default: JudgeRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/judge.vue'
    )
    const wrapper = mount(JudgeRender, {
      props: { question: { ...sampleQuestion, record: [0] }, questionId: 1 },
      global: _globalConfig,
    })
    const vm = wrapper.vm as any
    const result = vm.submit()
    expect(result).toEqual({ isCorrect: true })
  })
})
