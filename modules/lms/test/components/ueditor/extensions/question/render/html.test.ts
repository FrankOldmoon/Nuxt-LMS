/**
 * html component test (render)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/render/html.vue
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
  UButton: { template: '<button @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['icon', 'variant', 'size'] },
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

describe('question/render/html.vue', () => {
  const sampleQuestion = {
    type: 'html',
    name: 'HTML question',
    content: '<p>Hello World</p>',
    options: [],
    answer: [1],
    point: 1,
    record: [],
  }

  it('mounts and renders iframe with srcdoc', async () => {
    const { default: HtmlRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/html.vue'
    )
    const wrapper = mount(HtmlRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    const iframe = wrapper.find('iframe')
    expect(iframe.exists()).toBe(true)
    expect(iframe.attributes('srcdoc')).toContain('<p>Hello World</p>')
  })

  it('renders fullscreen toggle button', async () => {
    const { default: HtmlRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/html.vue'
    )
    const wrapper = mount(HtmlRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('exposes submit/reset/fillCorrectAnswer methods', async () => {
    const { default: HtmlRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/html.vue'
    )
    const wrapper = mount(HtmlRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    const vm = wrapper.vm as any
    expect(typeof vm.submit).toBe('function')
    expect(typeof vm.reset).toBe('function')
    expect(typeof vm.fillCorrectAnswer).toBe('function')
  })
})
