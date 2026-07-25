/**
 * puzzle 编辑组件测试 (edit)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/edit/puzzle.vue
 *
 * puzzle.vue 接收 form prop，使用 FormInputFile 上传图片，USelect 选分割数
 * 注意：config watch 有 early-return guard，当 curOpts 与 newOpts 相同时跳过 answer 同步
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
    // options 为 null 时，config 初始化为默认值，answer 同步为 [0..8]
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
    // config 与 curOpts 相同时 early-return，answer 不被同步
    // 但 config 正确读取了 form.options 的值
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
    // split=2 → 2x2=4 个预览块
    const previewDivs = wrapper.findAll('[style*="background-image"]')
    expect(previewDivs).toHaveLength(4)
  })
})
