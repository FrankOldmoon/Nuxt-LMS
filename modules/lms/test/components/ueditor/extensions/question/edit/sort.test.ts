/**
 * sort edit component test (edit)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/edit/sort.vue
 *
 * sort.vue uses vuedraggable, needs to stub draggable component
 * Note: syncToForm is only called on user interaction, answer is not synced during initialization
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
    // Simple stub: renders slot content (item slot)
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
    // Should render 3 drag items (each with 1 input)
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
    // Default initializes 3 empty items (dragItems has 3 items, but syncToForm is not called during initialization)
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
    // 2 drag items → 2 drag-handle icons + 2 delete buttons + 1 add button
    const icons = wrapper.findAll('.icon')
    const buttons = wrapper.findAll('button')
    expect(icons.length).toBeGreaterThanOrEqual(2)
    expect(buttons.length).toBeGreaterThanOrEqual(3)
  })
})
