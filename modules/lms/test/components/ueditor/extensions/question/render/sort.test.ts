/**
 * sort component test (render)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/render/sort.vue
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
  draggable: {
    template: '<div class="draggable"><div v-for="(item, i) in modelValue" :key="i"><slot name="item" :element="item" :index="i" /></div></div>',
    props: ['modelValue', 'itemKey', 'handle', 'animation', 'class'],
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

describe('question/render/sort.vue', () => {
  const sampleQuestion = {
    type: 'sort',
    name: 'Sort question',
    options: ['Item C', 'Item A', 'Item B'],
    answer: [1, 2, 0],
    point: 3,
    record: [],
    content: '',
  }

  it('mounts and renders sort hint', async () => {
    const { default: SortRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/sort.vue'
    )
    const wrapper = mount(SortRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('question.sortRenderHint')
  })

  it('renders draggable items', async () => {
    const { default: SortRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/sort.vue'
    )
    const wrapper = mount(SortRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.find('.draggable').exists()).toBe(true)
  })

  it('exposes submit/reset/fillCorrectAnswer methods', async () => {
    const { default: SortRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/sort.vue'
    )
    const wrapper = mount(SortRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    const vm = wrapper.vm as any
    expect(typeof vm.submit).toBe('function')
    expect(typeof vm.reset).toBe('function')
    expect(typeof vm.fillCorrectAnswer).toBe('function')
  })
})
