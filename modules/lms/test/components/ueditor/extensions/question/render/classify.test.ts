/**
 * classify 组件测试 (render)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/render/classify.vue
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
  draggable: {
    template: '<div class="draggable"><div v-for="(item, i) in modelValue" :key="i"><slot name="item" :element="item" /></div></div>',
    props: ['modelValue', 'itemKey', 'group', 'animation', 'class'],
  },
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

describe('question/render/classify.vue', () => {
  const sampleQuestion = {
    type: 'classify',
    name: 'Classify question',
    options: [
      { name: 'Fruits', items: ['Apple', 'Banana'] },
      { name: 'Vegetables', items: ['Carrot', 'Tomato'] },
    ],
    answer: [0, 0, 1, 1],
    point: 4,
    record: [],
    content: '',
  }

  it('mounts and renders classify hint', async () => {
    const { default: ClassifyRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/classify.vue'
    )
    const wrapper = mount(ClassifyRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('question.classifyRenderHint')
  })

  it('renders category names', async () => {
    const { default: ClassifyRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/classify.vue'
    )
    const wrapper = mount(ClassifyRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('Fruits')
    expect(wrapper.text()).toContain('Vegetables')
  })

  it('exposes submit/reset/fillCorrectAnswer methods', async () => {
    const { default: ClassifyRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/classify.vue'
    )
    const wrapper = mount(ClassifyRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    const vm = wrapper.vm as any
    expect(typeof vm.submit).toBe('function')
    expect(typeof vm.reset).toBe('function')
    expect(typeof vm.fillCorrectAnswer).toBe('function')
  })
})
