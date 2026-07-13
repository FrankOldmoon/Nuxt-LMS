/**
 * select 组件测试 (render)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/render/select.vue
 *
 * select 渲染组件无模板内容（内容由父组件渲染），只暴露 submit/reset/fillCorrectAnswer 方法
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
  stubs: { ueditorRender: { template: '<div />', props: ['json'] } },
  provide: {
    questionSubmitted: ref(false),
    questionIsCorrect: ref(false),
    questionFromRecord: ref(false),
  },
  mocks: { $t: (k: string) => k },
}

describe('question/render/select.vue', () => {
  const sampleQuestion = {
    type: 'select',
    name: 'Select question',
    options: ['A', 'B', 'C'],
    answer: ['A'],
    point: 1,
    record: [],
    content: '',
  }

  it('mounts without errors', async () => {
    const { default: SelectRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/select.vue'
    )
    const wrapper = mount(SelectRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('exposes submit/reset/fillCorrectAnswer methods', async () => {
    const { default: SelectRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/select.vue'
    )
    const wrapper = mount(SelectRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    const vm = wrapper.vm as any
    expect(typeof vm.submit).toBe('function')
    expect(typeof vm.reset).toBe('function')
    expect(typeof vm.fillCorrectAnswer).toBe('function')
  })
})
