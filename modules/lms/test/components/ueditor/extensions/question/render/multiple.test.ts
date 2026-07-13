/**
 * multiple 组件测试 (render)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/render/multiple.vue
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

describe('question/render/multiple.vue', () => {
  const sampleQuestion = {
    type: 'multiple',
    name: 'Multiple choice question',
    options: ['Option A', 'Option B', 'Option C'],
    answer: [0, 2],
    point: 2,
    record: [],
    content: '',
  }

  it('mounts and renders all options', async () => {
    const { default: MultipleRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/multiple.vue'
    )
    const wrapper = mount(MultipleRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    const labels = wrapper.findAll('label')
    expect(labels.length).toBe(3)
  })

  it('toggles selections on click', async () => {
    const { default: MultipleRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/multiple.vue'
    )
    const wrapper = mount(MultipleRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    const labels = wrapper.findAll('label')
    await labels[0].trigger('click')
    await labels[2].trigger('click')
    expect(sampleQuestion.record).toEqual([0, 2])
  })

  it('exposes submit/reset/fillCorrectAnswer methods', async () => {
    const { default: MultipleRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/multiple.vue'
    )
    const wrapper = mount(MultipleRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    const vm = wrapper.vm as any
    expect(typeof vm.submit).toBe('function')
    expect(typeof vm.reset).toBe('function')
    expect(typeof vm.fillCorrectAnswer).toBe('function')
  })
})
