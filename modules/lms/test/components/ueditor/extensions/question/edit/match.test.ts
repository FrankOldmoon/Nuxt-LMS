/**
 * match edit component test (edit)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/edit/match.vue
 *
 * match.vue receives form prop, edits pairs [{left, right}]
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

describe('question/edit/match.vue', () => {
  it('mounts and renders pairs from form.options', async () => {
    const { default: MatchEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/match.vue'
    )
    const form = {
      options: [
        { left: 'A', right: '1' },
        { left: 'B', right: '2' },
      ],
      answer: [],
    }
    const wrapper = mount(MatchEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    // Each pair has 2 inputs (left + right), 2 pairs = 4
    expect(wrapper.findAll('input')).toHaveLength(4)
  })

  it('initializes default 2 pairs when empty', async () => {
    const { default: MatchEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/match.vue'
    )
    const form = { options: [], answer: [] }
    mount(MatchEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    expect(form.options).toHaveLength(2)
    expect(form.answer).toEqual([0, 1])
  })

  it('renders correct number of inputs for pairs', async () => {
    const { default: MatchEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/match.vue'
    )
    const form = {
      options: [
        { left: 'X', right: '10' },
        { left: 'Y', right: '20' },
        { left: 'Z', right: '30' },
      ],
      answer: [],
    }
    const wrapper = mount(MatchEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    // 3 pairs × 2 inputs (left + right) = 6 inputs
    expect(wrapper.findAll('input')).toHaveLength(6)
  })
})
