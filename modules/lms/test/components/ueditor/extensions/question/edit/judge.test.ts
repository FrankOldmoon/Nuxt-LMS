/**
 * judge 编辑组件测试 (edit)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/edit/judge.vue
 *
 * judge.vue 接收 form prop，固定 options 为 [correct, wrong]，answer 默认 [0]
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _mocks = { $t: (k: string) => k }

describe('question/edit/judge.vue', () => {
  it('mounts and sets fixed options [correct, wrong]', async () => {
    const { default: JudgeEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/judge.vue'
    )
    const form = { options: [], answer: [] }
    mount(JudgeEditor, {
      props: { form },
      global: { mocks: _mocks },
    })
    // judge 固定 options = [t('question.correct'), t('question.wrong')]
    expect(form.options).toHaveLength(2)
    expect(form.answer).toEqual([0])
  })

  it('renders two option labels', async () => {
    const { default: JudgeEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/judge.vue'
    )
    const form = { options: [], answer: [] }
    const wrapper = mount(JudgeEditor, {
      props: { form },
      global: { mocks: _mocks },
    })
    // judge 有 1 个 header label + 2 个选项 label = 3 个
    const labels = wrapper.findAll('label')
    expect(labels).toHaveLength(3)
  })

  it('preserves existing answer when not empty', async () => {
    const { default: JudgeEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/judge.vue'
    )
    const form = { options: [], answer: [1] }
    mount(JudgeEditor, {
      props: { form },
      global: { mocks: _mocks },
    })
    // answer 已有值时不覆盖
    expect(form.answer).toEqual([1])
  })
})
