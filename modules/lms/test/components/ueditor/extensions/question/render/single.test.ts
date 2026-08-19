/**
 * single 组件测试 (render)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/render/single.vue
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

describe('question/render/single.vue', () => {
  const sampleQuestion = {
    type: 'single',
    name: 'Single choice question',
    options: ['Option A', 'Option B', 'Option C'],
    answer: [1],
    point: 1,
    record: [],
    content: '',
  }

  it('mounts and renders all options', async () => {
    const { default: SingleRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/single.vue'
    )
    const wrapper = mount(SingleRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    const labels = wrapper.findAll('label')
    expect(labels.length).toBe(3)
  })

  it('selects an option on click and updates record', async () => {
    const { default: SingleRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/single.vue'
    )
    const wrapper = mount(SingleRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    const labels = wrapper.findAll('label')
    await labels[1].trigger('click')
    expect(sampleQuestion.record).toEqual([1])
  })

  it('exposes submit/reset/fillCorrectAnswer methods', async () => {
    const { default: SingleRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/single.vue'
    )
    const wrapper = mount(SingleRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    const vm = wrapper.vm as any
    expect(typeof vm.submit).toBe('function')
    expect(typeof vm.reset).toBe('function')
    expect(typeof vm.fillCorrectAnswer).toBe('function')
  })

  it('submit returns correct result when answer matches', async () => {
    const { default: SingleRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/single.vue'
    )
    // 服务端判分：stub cRequest 返回 submit 响应（show 不下发答案，对错由服务端判定）
    ;(globalThis as any).cRequest = async () => ({ isCorrect: true, rate: 1, score: 1, answer: [1], explanation: null })
    const wrapper = mount(SingleRender, {
      props: { question: { ...sampleQuestion, record: [1] }, questionId: 1 },
      global: _globalConfig,
    })
    const vm = wrapper.vm as any
    const result = await vm.submit()
    expect(result).toEqual({ isCorrect: true })
  })
})
