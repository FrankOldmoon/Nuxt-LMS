/**
 * sort 编辑组件测试 (edit)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/edit/sort.vue
 *
 * sort.vue 使用 vuedraggable，需 stub draggable 组件
 * 注意：syncToForm 只在用户交互时调用，初始化时不同步 answer
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
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @change="$emit(\'change\')" />',
    props: ['modelValue', 'placeholder', 'size'],
    emits: ['update:modelValue', 'change'],
  },
  UIcon: { template: '<span class="icon" />', props: ['name'] },
  draggable: {
    // 简单 stub：渲染 slot 内容（item slot）
    template: '<div class="draggable"><slot name="item" v-for="(element, index) in modelValue" :element="element" :index="index" /></div>',
    props: ['modelValue', 'itemKey', 'handle', 'animation'],
  },
}

const _mocks = { $t: (k: string) => k }

describe('question/edit/sort.vue', () => {
  it('mounts and renders drag items from form.options', async () => {
    const { default: SortEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/sort.vue'
    )
    const form = { options: ['apple', 'banana', 'cherry'], answer: [] }
    const wrapper = mount(SortEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    // 应渲染 3 个拖拽项（每个有 1 个 input）
    const inputs = wrapper.findAll('input')
    expect(inputs).toHaveLength(3)
  })

  it('initializes default 3 items when form.options empty', async () => {
    const { default: SortEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/sort.vue'
    )
    const form = { options: [], answer: [] }
    const wrapper = mount(SortEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    // 默认初始化 3 个空项（dragItems 有 3 项，但 syncToForm 不在初始化时调用）
    const inputs = wrapper.findAll('input')
    expect(inputs).toHaveLength(3)
  })

  it('renders drag handle and delete button for each item', async () => {
    const { default: SortEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/sort.vue'
    )
    const form = { options: ['a', 'b'], answer: [0, 1] }
    const wrapper = mount(SortEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    // 2 个拖拽项 → 2 个 drag-handle icon + 2 个 delete button + 1 个 add button
    const icons = wrapper.findAll('.icon')
    const buttons = wrapper.findAll('button')
    expect(icons.length).toBeGreaterThanOrEqual(2)
    expect(buttons.length).toBeGreaterThanOrEqual(3)
  })
})
