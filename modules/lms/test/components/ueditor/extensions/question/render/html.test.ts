/**
 * html 组件测试 (render)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/render/html.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n, setMockAuthUser, setMockLmsContext } from '../../../../../../../../test/setup/nuxt-stubs'

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

  it('正确率 >0 时 hasAnswer 为 true，且实时显示正确率（未提交也显示）', async () => {
    const { default: HtmlRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/html.vue'
    )
    const wrapper = mount(HtmlRender, {
      props: { question: { ...sampleQuestion, record: [1] }, questionId: 1 },
      global: _globalConfig,
    })
    const vm = wrapper.vm as any
    expect(vm.hasAnswer).toBe(true)
    // 未提交仍实时显示正确率
    expect(wrapper.text()).toContain('question.htmlCorrectRate')
    expect(wrapper.text()).toContain('100%')
  })

  it('正确率为 0 时 hasAnswer 为 false（submit 不可用）', async () => {
    const { default: HtmlRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/html.vue'
    )
    const wrapper = mount(HtmlRender, {
      props: { question: { ...sampleQuestion, record: [0] }, questionId: 1 },
      global: _globalConfig,
    })
    const vm = wrapper.vm as any
    expect(vm.hasAnswer).toBe(false)
  })

  it('url 模式：iframe 使用 src 而非 srcdoc，并给定固定高度', async () => {
    const { default: HtmlRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/html.vue'
    )
    const urlQuestion = {
      ...sampleQuestion,
      content: '<p>ignored</p>',
      extra: { mode: 'url', url: 'https://example.com' },
    }
    const wrapper = mount(HtmlRender, {
      props: { question: urlQuestion, questionId: 1 },
      global: _globalConfig,
    })
    const iframe = wrapper.find('iframe')
    expect(iframe.exists()).toBe(true)
    expect(iframe.attributes('src')).toBe('https://example.com')
    expect(iframe.attributes('srcdoc')).toBeUndefined()
  })

  it('url 模式：附带 username 与 room（章节id_班级id）', async () => {
    setMockLmsContext(1, 7)
    setMockAuthUser({ id: 9, username: 'alice', name: 'Alice', classId: 3, defaultClass: { id: 3, name: 'C3' } })
    const { default: HtmlRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/html.vue'
    )
    const urlQuestion = {
      ...sampleQuestion,
      extra: { mode: 'url', url: 'https://example.com/play' },
    }
    const wrapper = mount(HtmlRender, {
      props: { question: urlQuestion, questionId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.find('iframe').attributes('src'))
      .toBe('https://example.com/play?username=Alice&room=7_3')
  })

  it('html 默认模式：extra 缺失时依旧使用 srcdoc', async () => {
    const { default: HtmlRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/html.vue'
    )
    const wrapper = mount(HtmlRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    const iframe = wrapper.find('iframe')
    expect(iframe.attributes('srcdoc')).toContain('<p>Hello World</p>')
    expect(iframe.attributes('src')).toBeUndefined()
  })
})
