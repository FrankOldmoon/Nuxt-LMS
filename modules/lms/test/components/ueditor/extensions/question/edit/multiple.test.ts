/**
 * multiple 编辑组件测试 (edit)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/edit/multiple.vue
 *
 * multiple.vue 接收 form prop，使用 UCheckbox 多选答案
 * UCheckbox 使用 @change="toggleAnswer(idx)" 而非 @update:modelValue
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
  // UCheckbox stub: must emit 'change' event (multiple.vue uses @change="toggleAnswer(idx)")
  UCheckbox: {
    template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'change\')" />',
    props: ['modelValue', 'label', 'size'],
    emits: ['update:modelValue', 'change'],
  },
  richEditor: { template: '<div class="rich-editor" />', props: ['modelValue'] },
}

const _mocks = { $t: (k: string) => k }

describe('question/edit/multiple.vue', () => {
  it('mounts and renders 4 default options when empty', async () => {
    const { default: MultipleEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/multiple.vue'
    )
    const form = { options: [], answer: [] }
    mount(MultipleEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    expect(form.options).toHaveLength(4)
    expect(form.answer).toEqual([])
  })

  it('toggles answer on checkbox change', async () => {
    const { default: MultipleEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/multiple.vue'
    )
    const form = { options: ['A', 'B', 'C', 'D'], answer: [] }
    const wrapper = mount(MultipleEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    // 勾选第 1 个
    await checkboxes[0].trigger('change')
    expect(form.answer).toEqual([0])
    // 勾选第 3 个
    await checkboxes[2].trigger('change')
    expect(form.answer).toEqual([0, 2])
  })

  it('renders correct checkbox states from form.answer', async () => {
    const { default: MultipleEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/multiple.vue'
    )
    const form = { options: ['A', 'B', 'C'], answer: [0, 2] }
    const wrapper = mount(MultipleEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    // 第 1 和第 3 个应勾选
    expect(checkboxes[0].element.checked).toBe(true)
    expect(checkboxes[1].element.checked).toBe(false)
    expect(checkboxes[2].element.checked).toBe(true)
  })
})
