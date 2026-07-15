/**
 * puzzle edit component test (edit)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/edit/puzzle.vue
 *
 * puzzle.vue receives form prop, uses FormInputFile to upload image, USelect to select split count
 * Note: config watch has an early-return guard, skips answer sync when curOpts equals newOpts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  FormInputFile: { template: '<div class="form-input-file" />', props: ['modelValue', 'placeholder', 'multiple'] },
  USelect: {
    template: '<select @change="$emit(\'update:modelValue\', Number($event.target.value))"><option v-for="o in items" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
    props: ['modelValue', 'items', 'size'],
    emits: ['update:modelValue'],
  },
}

const _mocks = { $t: (k: string) => k }

describe('question/edit/puzzle.vue', () => {
  it('mounts and initializes config when form.options is null', async () => {
    const { default: PuzzleEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/puzzle.vue'
    )
    const form = { options: null, answer: [] }
    mount(PuzzleEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    // When options is null, config is initialized to default values, answer is synced to [0..8]
    expect(form.options).toEqual({ url: '', split: 3 })
    expect(form.answer).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('preserves existing config when form.options has values', async () => {
    const { default: PuzzleEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/puzzle.vue'
    )
    const form = { options: { url: 'http://example.com/img.png', split: 2 }, answer: [] }
    mount(PuzzleEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    // When config equals curOpts, early-return, answer is not synced
    // But config correctly read the value of form.options
    expect(form.options.url).toBe('http://example.com/img.png')
    expect(form.options.split).toBe(2)
  })

  it('renders preview grid when url is present', async () => {
    const { default: PuzzleEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/puzzle.vue'
    )
    const form = { options: { url: 'http://example.com/img.png', split: 2 }, answer: [] }
    const wrapper = mount(PuzzleEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    // split=2 → 2x2=4 preview blocks
    const previewDivs = wrapper.findAll('[style*="background-image"]')
    expect(previewDivs).toHaveLength(4)
  })
})
