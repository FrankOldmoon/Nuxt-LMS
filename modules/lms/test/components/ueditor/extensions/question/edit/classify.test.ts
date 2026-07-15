/**
 * classify edit component test (edit)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/edit/classify.vue
 *
 * classify.vue receives form prop, edits classification structure [{name, items:[]}]
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
    props: ['modelValue', 'placeholder', 'size'],
    emits: ['update:modelValue'],
  },
  UIcon: { template: '<span class="icon" />', props: ['name'] },
}

const _mocks = { $t: (k: string) => k }

describe('question/edit/classify.vue', () => {
  it('mounts and renders categories from form.options', async () => {
    const { default: ClassifyEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/classify.vue'
    )
    const form = {
      options: [
        { name: 'Fruits', items: ['apple', 'banana'] },
        { name: 'Veg', items: ['carrot'] },
      ],
      answer: [],
    }
    const wrapper = mount(ClassifyEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    // Should render 2 categories, each with a name input
    const inputs = wrapper.findAll('input')
    // 2 names + 2+1 items = 3 item inputs
    expect(inputs.length).toBeGreaterThanOrEqual(5)
  })

  it('initializes default 2 categories when empty', async () => {
    const { default: ClassifyEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/classify.vue'
    )
    const form = { options: [], answer: [] }
    mount(ClassifyEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    expect(form.options).toHaveLength(2)
    // answer should be the flattened classification index [0, 0, 1, 1]
    expect(form.answer).toEqual([0, 0, 1, 1])
  })

  it('auto-generates flattened answer from category items', async () => {
    const { default: ClassifyEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/classify.vue'
    )
    const form = {
      options: [
        { name: 'A', items: ['x', 'y', 'z'] },
        { name: 'B', items: ['w'] },
      ],
      answer: [],
    }
    mount(ClassifyEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    // 3 items in cat 0 + 1 item in cat 1 → [0, 0, 0, 1]
    expect(form.answer).toEqual([0, 0, 0, 1])
  })
})
