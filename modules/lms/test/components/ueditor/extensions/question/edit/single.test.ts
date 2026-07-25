/**
 * single 编辑组件测试 (edit)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/edit/single.vue
 *
 * single.vue 接收 form prop（Object, required），直接修改 form.options/form.answer
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UButton: { template: '<button @click="$emit(\'click\')">{{ label }}<slot /></button>', props: ['variant', 'size', 'color', 'icon', 'disabled'] },
  richEditor: { template: '<div class="rich-editor" />', props: ['modelValue'] },
}

const _mocks = { $t: (k: string) => k }

describe('question/edit/single.vue', () => {
  it('mounts and renders options from form', async () => {
    const { default: SingleEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/single.vue'
    )
    const form = { options: ['A', 'B', 'C', 'D'], answer: [0] }
    const wrapper = mount(SingleEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    // 渲染 4 个选项（每个包含一个 richEditor）
    expect(wrapper.findAll('.rich-editor')).toHaveLength(4)
  })

  it('initializes default 4 options when form.options is empty', async () => {
    const { default: SingleEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/single.vue'
    )
    const form = { options: [], answer: [] }
    mount(SingleEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    expect(form.options).toHaveLength(4)
    expect(form.answer).toEqual([0])
  })

  it('selects an answer on radio label click', async () => {
    const { default: SingleEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/single.vue'
    )
    const form = { options: ['A', 'B', 'C', 'D'], answer: [0] }
    const wrapper = mount(SingleEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    // labels[0] = header label, labels[1] = option 0, labels[2] = option 1
    const labels = wrapper.findAll('label')
    // 点击第 2 个选项的 label（selectAnswer(1)）
    await labels[2].trigger('click')
    expect(form.answer).toEqual([1])
  })
})
