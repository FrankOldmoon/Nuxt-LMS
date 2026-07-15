/**
 * html edit component test (edit)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/edit/html.vue
 *
 * html.vue receives form prop, uses Monaco to edit HTML, content stores HTML string
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
})
