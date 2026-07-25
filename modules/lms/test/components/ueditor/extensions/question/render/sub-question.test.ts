/**
 * sub-question 组件测试 (render)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/render/sub-question.vue
 *
 * sub-question 自己 provide injects（questionSubmitted 等），不需要外部 provide
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
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
  mocks: { $t: (k: string) => k },
}

describe('question/render/sub-question.vue', () => {
  const sampleSubQuestion = {
    type: 'single',
    name: 'Sub question 1',
    content: 'What is 1+1?',
    options: ['1', '2', '3'],
    answer: [1],
    point: 1,
  }

  it('mounts and renders sub question name', async () => {
    const { default: SubQuestion } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/sub-question.vue'
    )
    const wrapper = mount(SubQuestion, {
      props: { subQuestion: sampleSubQuestion, index: 0 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('Sub question 1')
  })

  it('renders index number (1-based)', async () => {
    const { default: SubQuestion } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/sub-question.vue'
    )
    const wrapper = mount(SubQuestion, {
      props: { subQuestion: sampleSubQuestion, index: 2 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('3')
  })

  it('exposes submit/hasAnswer/fillCorrectAnswer methods', async () => {
    const { default: SubQuestion } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/sub-question.vue'
    )
    const wrapper = mount(SubQuestion, {
      props: { subQuestion: sampleSubQuestion, index: 0 },
      global: _globalConfig,
    })
    const vm = wrapper.vm as any
    expect(typeof vm.submit).toBe('function')
    expect(typeof vm.hasAnswer).toBe('function')
    expect(typeof vm.fillCorrectAnswer).toBe('function')
  })
})
