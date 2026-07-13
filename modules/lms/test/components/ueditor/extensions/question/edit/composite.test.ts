/**
 * composite 编辑组件测试 (edit)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/edit/composite.vue
 *
 * composite.vue 使用 useCompositeEdit composable，子题列表存储在 form.content 数组
 * useCompositeEdit 导入所有子编辑器（single/judge/multiple/...），需 stub richEditor 等
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
    // 空列表时应显示 compositeEmpty 提示
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
    // 应渲染 2 个子题（每个有 name input）
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
    // totalPoint = 3 + 2 = 5，同步到 form.point
    expect(form.point).toBe(5)
  })
})
