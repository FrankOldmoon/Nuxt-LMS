/**
 * evaluation edit component test (edit)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/edit/evaluation.vue
 *
 * evaluation.vue receives form prop, edits evaluation goal and threshold
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UTextarea: {
    template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"></textarea>',
    props: ['modelValue', 'placeholder', 'rows', 'size'],
    emits: ['update:modelValue'],
  },
  UInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder', 'size', 'type', 'step', 'min', 'max'],
    emits: ['update:modelValue'],
  },
}

const _mocks = { $t: (k: string) => k }

describe('question/edit/evaluation.vue', () => {
  it('mounts and renders goal textarea', async () => {
    const { default: EvaluationEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/evaluation.vue'
    )
    const form = { options: { goal: 'Test goal', threshold: 0.8 } }
    const wrapper = mount(EvaluationEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    const textarea = wrapper.find('textarea')
    expect(textarea.element.value).toBe('Test goal')
  })

  it('initializes default options when empty', async () => {
    const { default: EvaluationEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/evaluation.vue'
    )
    const form = { options: null }
    mount(EvaluationEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    expect(form.options).toEqual({ goal: '', threshold: 0.8 })
  })

  it('updates goal on textarea input', async () => {
    const { default: EvaluationEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/evaluation.vue'
    )
    const form = { options: { goal: '', threshold: 0.8 } }
    const wrapper = mount(EvaluationEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('New goal')
    expect(form.options.goal).toBe('New goal')
  })
})
