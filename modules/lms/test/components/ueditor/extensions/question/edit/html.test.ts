/**
 * html 编辑组件测试 (edit)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/edit/html.vue
 *
 * html.vue 接收 form prop，使用 Monaco 编辑 HTML，content 存储 HTML 字符串
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  Monaco: {
    template: '<div class="monaco" />',
    props: ['modelValue', 'language', 'autoFormat'],
    emits: ['update:modelValue'],
  },
  URadioGroup: {
    template: '<div class="radio-group" />',
    props: ['modelValue', 'items'],
    emits: ['update:modelValue'],
  },
  UInput: {
    template: '<input class="uinput" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
}

const _mocks = { $t: (k: string) => k }

describe('question/edit/html.vue', () => {
  it('mounts and renders Monaco editor', async () => {
    const { default: HtmlEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/html.vue'
    )
    const form = { content: '<p>hello</p>', answer: [] }
    const wrapper = mount(HtmlEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    expect(wrapper.find('.monaco').exists()).toBe(true)
  })

  it('initializes answer=[1] and content="" when empty', async () => {
    const { default: HtmlEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/html.vue'
    )
    const form = { content: null, answer: [] }
    mount(HtmlEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    expect(form.answer).toEqual([1])
    expect(form.content).toBe('')
  })

  it('renders preview iframe when content is present', async () => {
    const { default: HtmlEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/html.vue'
    )
    const form = { content: '<b>bold</b>', answer: [1] }
    const wrapper = mount(HtmlEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    expect(wrapper.find('iframe').exists()).toBe(true)
  })

  it('url 模式下显示 url 输入框并加载 src 预览，且初始化 extra', async () => {
    const { default: HtmlEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/html.vue'
    )
    const form = { content: '', answer: [], extra: { mode: 'url', url: 'https://example.com' } }
    const wrapper = mount(HtmlEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    // url 模式：Monaco 不渲染，url 输入框渲染，iframe 以 src 加载
    expect(wrapper.find('.monaco').exists()).toBe(false)
    expect(wrapper.find('.uinput').exists()).toBe(true)
    const iframe = wrapper.find('iframe')
    expect(iframe.exists()).toBe(true)
    expect(iframe.attributes('src')).toBe('https://example.com')
    expect(iframe.attributes('srcdoc')).toBeUndefined()
  })

  it('html 默认模式：extra 缺失时自动初始化为 html', async () => {
    const { default: HtmlEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/html.vue'
    )
    const form = { content: '<p>hi</p>', answer: [] }
    mount(HtmlEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    expect(form.extra.mode).toBe('html')
  })
})
