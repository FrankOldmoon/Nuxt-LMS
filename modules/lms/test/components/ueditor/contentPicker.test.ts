// ueditor/contentPicker.vue component tests
// @see modules/lms/components/ueditor/contentPicker.vue
//
// Content picker modal: select existing questions/homework/comments/quizzes/races
// or import via JSON. Uses provide/inject pattern for sub-components.
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalConfig = {
  mocks: { $t: (k: string) => k, $i18n: { t: (k: string) => k, locale: { value: 'en' } } },
  stubs: {
    UModal: true,
    ContentPickerHeader: true,
    ContentPickerPreviewArea: true,
    ContentPickerFooter: true,
    ContentPickerImportModal: true,
    QuestionEdit: true,
    HomeworkEdit: true,
    CommentEdit: true,
    QuizEdit: true,
    RaceEdit: true,
  },
}

describe('ueditor/contentPicker.vue', () => {
  it('mounts without error with default props', async () => {
    const { default: ContentPicker } = await import('../../../components/ueditor/contentPicker.vue')
    const wrapper = mount(ContentPicker, {
      props: { modelValue: false, type: 'questions' },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('mounts with previewMode enabled', async () => {
    const { default: ContentPicker } = await import('../../../components/ueditor/contentPicker.vue')
    const wrapper = mount(ContentPicker, {
      props: { modelValue: false, type: 'questions', previewMode: true },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('accepts different content types (homeworks, comments, quizzes)', async () => {
    const { default: ContentPicker } = await import('../../../components/ueditor/contentPicker.vue')
    for (const type of ['homeworks', 'comments', 'quizzes']) {
      const wrapper = mount(ContentPicker, {
        props: { modelValue: false, type },
        global: _globalConfig,
      })
      expect(wrapper.exists()).toBe(true)
    }
  })
})
