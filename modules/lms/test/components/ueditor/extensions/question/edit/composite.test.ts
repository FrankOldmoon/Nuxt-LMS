/**
 * composite edit component test (edit)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/edit/composite.vue
 *
 * composite.vue uses useCompositeEdit composable, sub-question list stored in form.content array
 * useCompositeEdit imports all sub-editors (single/judge/multiple/...), needs to stub richEditor etc.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UButton: { template: '<button @click="$emit(\'click\')">{{ label }}<slot /></button>', props: ['variant', 'size', 'color', 'icon'] },
  UInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder', 'size', 'type'],
    emits: ['update:modelValue'],
  },
  USelect: {
    template: '<select @change="$emit(\'update:modelValue\', $event.target.value); $emit(\'change\')"><option v-for="o in items" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
    props: ['modelValue', 'items', 'size'],
    emits: ['update:modelValue', 'change'],
  },
  richEditor: { template: '<div class="rich-editor" />', props: ['modelValue'] },
}

const _mocks = { $t: (k: string) => k }

describe('question/edit/composite.vue', () => {
  it('mounts and shows empty hint when no sub questions', async () => {
    const { default: CompositeEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/composite.vue'
    )
    const form = { content: [], options: [], answer: [], point: 0, tags: [] }
    const wrapper = mount(CompositeEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    // When the list is empty, should show compositeEmpty hint
    expect(wrapper.text()).toContain('question.compositeEmpty')
  })

  it('renders sub questions from form.content', async () => {
    const { default: CompositeEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/composite.vue'
    )
    const form = {
      content: [
        { type: 'single', name: 'Q1', content: '', options: ['', ''], answer: [0], point: 1, tags: [], explanation: '' },
        { type: 'judge', name: 'Q2', content: '', options: ['correct', 'wrong'], answer: [0], point: 1, tags: [], explanation: '' },
      ],
      options: [],
      answer: [],
      point: 0,
      tags: [],
    }
    const wrapper = mount(CompositeEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    // Should render 2 sub-questions (each with a name input)
    const inputs = wrapper.findAll('input')
    expect(inputs.length).toBeGreaterThanOrEqual(2)
  })

  it('calculates total point from sub questions', async () => {
    const { default: CompositeEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/composite.vue'
    )
    const form = {
      content: [
        { type: 'single', name: 'Q1', content: '', options: ['', ''], answer: [0], point: 3, tags: [], explanation: '' },
        { type: 'judge', name: 'Q2', content: '', options: ['correct', 'wrong'], answer: [0], point: 2, tags: [], explanation: '' },
      ],
      options: [],
      answer: [],
      point: 0,
      tags: [],
    }
    mount(CompositeEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    // totalPoint = 3 + 2 = 5, synced to form.point
    expect(form.point).toBe(5)
  })
})
