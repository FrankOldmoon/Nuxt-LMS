/**
 * quiz render component test
 * @see modules/lms/components/ueditor/extensions/nodes/vue/quiz/render.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n, setMockLmsContext } from '../../../../../../../test/setup/nuxt-stubs'

// Stub composables not in nuxt-stubs
;(globalThis as any).useChapterTask = () => null
;(globalThis as any).useUserCard = () => ({ refreshTrigger: ref(0), refresh: () => {} })

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  setMockLmsContext(1, 1)
})

const _globalStubs = {
  ueditorRender: { template: '<div class="ueditor-render-stub" />', props: ['json'] },
  UButton: { template: '<button @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label'] },
  UIcon: { template: '<span />', props: ['name'] },
  UModal: { template: '<div v-if="open"><slot name="content" /></div>', props: ['open'] },
  UInput: { template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'type', 'placeholder', 'size', 'disabled'] },
  UInputTags: { template: '<div />', props: ['modelValue', 'placeholder'] },
  UFormField: { template: '<div><slot /></div>', props: ['label', 'size'] },
  UBadge: { template: '<span><slot /></span>', props: ['color'] },
  ClientOnly: { template: '<div><slot /></div>' },
  LmsRecordsModalQuiz: { template: '<div v-if="modelValue" />', props: ['modelValue', 'courseId', 'cid', 'quizPoint', 'questions'] },
  richEditor: { template: '<div />', props: ['modelValue'] },
  Monaco: { template: '<div />', props: ['modelValue', 'language', 'autoFormat'] },
  UeditorContentPicker: { template: '<div v-if="modelValue" />', props: ['modelValue', 'type'] },
  // Stub QuestionRender
  QuestionRender: { template: '<div class="question-stub" />', props: ['node', 'courseId', 'inQuiz'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string, params?: any) => {
    if (params) {
      let s = k
      for (const [kk, v] of Object.entries(params)) s = s.replace(`{${kk}}`, String(v))
      return s
    }
    return k
  } },
}

describe('quiz/render.vue', () => {
  it('shows loading when quizId is set and data is being fetched', async () => {
    const { default: QuizRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/quiz/render.vue'
    )
    const wrapper = mount(QuizRender, {
      props: { node: { attrs: { content: '999' } }, courseId: 1 },
      global: _globalConfig,
    })
    // Before flushPromises, pending is true (fetch in progress)
    expect(wrapper.text()).toContain('quiz.loading')
    await flushPromises()
  })

  it('renders quiz wrapper with default data', async () => {
    const { default: QuizRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/quiz/render.vue'
    )
    const wrapper = mount(QuizRender, {
      props: { node: { attrs: { content: '0' } }, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.quiz-render').exists()).toBe(true)
  })

  it('shows quiz label when quiz data is available', async () => {
    const { default: QuizRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/quiz/render.vue'
    )
    const wrapper = mount(QuizRender, {
      props: { node: { attrs: { content: '0' } }, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('quiz.label')
  })
})
