/**
 * fill edit component test (edit)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/edit/fill.vue
 *
 * fill.vue uses useFillEdit composable, extracts {{}} answers from content
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UCheckbox: {
    template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
    props: ['modelValue', 'label', 'size'],
    emits: ['update:modelValue'],
  },
  UInput: { template: '<input />', props: ['modelValue', 'placeholder', 'size'] },
}

const _mocks = { $t: (k: string) => k }

describe('question/edit/fill.vue', () => {
  it('mounts and extracts answers from string content', async () => {
    const { default: FillEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/fill.vue'
    )
    const form = { content: 'The {{sky}} is {{blue}}', options: [], answer: [] }
    const wrapper = mount(FillEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    // useFillEdit should extract 2 answers from content and sync to form.answer
    expect(form.answer).toEqual(['sky', 'blue'])
    expect(wrapper.text()).toContain('sky')
    expect(wrapper.text()).toContain('blue')
  })

  it('shows placeholder hint when no answers parsed', async () => {
    const { default: FillEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/fill.vue'
    )
    const form = { content: 'no answers here', options: [], answer: [] }
    mount(FillEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    expect(form.answer).toEqual([])
  })
})
