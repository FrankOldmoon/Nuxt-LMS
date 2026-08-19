/**
 * quiz index 组件测试 (TipTap node-view)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/quiz/index.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, reactive } from 'vue'
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
  QuestionRender: { template: '<div class="question-stub" />', props: ['node', 'courseId', 'inQuiz'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('quiz/index.vue', () => {
  it('mounts and sets meta title/icon', async () => {
    const { default: QuizIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/quiz/index.vue'
    )
    const meta = reactive({ title: '', icon: '', hasSettings: false })
    const wrapper = mount(QuizIndex, {
      props: {
        node: { attrs: { content: '1' } },
        updateAttributes: () => {},
      },
      global: {
        ..._globalConfig,
        provide: {
          nodeViewShowConfig: ref(false),
          nodeViewMeta: meta,
        },
      },
    })
    await flushPromises()
    expect(meta.title).toBe('quiz.label')
    expect(meta.icon).toBe('i-lucide-clipboard-check')
    expect(meta.hasSettings).toBe(true)
  })

  it('renders the quiz node wrapper', async () => {
    const { default: QuizIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/quiz/index.vue'
    )
    const wrapper = mount(QuizIndex, {
      props: {
        node: { attrs: { content: '1' } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.quiz-render').exists()).toBe(true)
  })
})
