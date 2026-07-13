/**
 * composite 组件测试 (render)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/render/composite.vue
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
  ueditorRender: { template: '<div class="ueditor-render">{{ json }}</div>', props: ['json'] },
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  provide: {
    questionSubmitted: ref(false),
    questionIsCorrect: ref(false),
    questionFromRecord: ref(false),
  },
  mocks: { $t: (k: string) => k },
}

describe('question/render/composite.vue', () => {
  const sampleQuestion = {
    type: 'composite',
    name: 'Composite question',
    content: [
      {
        type: 'single',
        name: 'Sub 1',
        content: 'Pick 1',
        options: ['A', 'B'],
        answer: [0],
        point: 1,
      },
      {
        type: 'judge',
        name: 'Sub 2',
        content: 'True or false?',
        options: ['Correct', 'Wrong'],
        answer: [1],
        point: 1,
      },
    ],
    options: [],
    answer: [],
    point: 2,
    record: [],
  }

  it('mounts and renders sub questions', async () => {
    const { default: CompositeRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/composite.vue'
    )
    const wrapper = mount(CompositeRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('Sub 1')
    expect(wrapper.text()).toContain('Sub 2')
  })

  it('shows no-sub prompt when content is empty', async () => {
    const { default: CompositeRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/composite.vue'
    )
    const wrapper = mount(CompositeRender, {
      props: { question: { ...sampleQuestion, content: [] }, questionId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('question.compositeNoSub')
  })

  it('exposes submit/reset/fillCorrectAnswer methods', async () => {
    const { default: CompositeRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/composite.vue'
    )
    const wrapper = mount(CompositeRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    const vm = wrapper.vm as any
    expect(typeof vm.submit).toBe('function')
    expect(typeof vm.reset).toBe('function')
    expect(typeof vm.fillCorrectAnswer).toBe('function')
  })
})
