/**
 * short-answer edit component test (edit)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/edit/short-answer.vue
 *
 * short-answer.vue receives form prop, edits regex pattern answers
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder', 'size', 'type'],
    emits: ['update:modelValue'],
  },
}

const _mocks = { $t: (k: string) => k }

describe('question/edit/short-answer.vue', () => {
  it('mounts and syncs regex from form.answer', async () => {
    const { default: ShortAnswerEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/short-answer.vue'
    )
    const form = { answer: ['^hello$'], options: [] }
    const wrapper = mount(ShortAnswerEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    const input = wrapper.find('input')
    expect(input.element.value).toBe('^hello$')
  })

  it('initializes regex from form.answer when array', async () => {
    const { default: ShortAnswerEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/short-answer.vue'
    )
    const form = { answer: ['\\d+'], options: [] }
    mount(ShortAnswerEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    expect(form.answer).toEqual(['\\d+'])
  })

  it('updates form.answer on input', async () => {
    const { default: ShortAnswerEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/short-answer.vue'
    )
    const form = { answer: [''], options: [] }
    const wrapper = mount(ShortAnswerEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    const input = wrapper.find('input')
    await input.setValue('^test$')
    expect(form.answer).toEqual(['^test$'])
  })
})
