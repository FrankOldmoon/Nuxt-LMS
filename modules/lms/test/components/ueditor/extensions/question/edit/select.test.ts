/**
 * select 编辑组件测试 (edit)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/edit/select.vue
 *
 * select.vue 从 content 中提取 ||answer|| 答案，用 UInputTags 编辑 options
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UInputTags: {
    template: '<div class="input-tags" />',
    props: ['modelValue', 'placeholder', 'addText'],
    emits: ['update:modelValue'],
  },
}

const _mocks = { $t: (k: string) => k }

describe('question/edit/select.vue', () => {
  it('mounts and extracts answers from ||answer|| content', async () => {
    const { default: SelectEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/select.vue'
    )
    const form = { content: 'Pick ||red|| and ||blue||', options: [], answer: [] }
    const wrapper = mount(SelectEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    // 应提取 2 个答案
    expect(form.answer).toEqual(['red', 'blue'])
    expect(wrapper.text()).toContain('red')
    expect(wrapper.text()).toContain('blue')
  })

  it('initializes options as array when not array', async () => {
    const { default: SelectEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/select.vue'
    )
    const form = { content: 'no answers', options: null, answer: [] }
    mount(SelectEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    expect(Array.isArray(form.options)).toBe(true)
  })
})
