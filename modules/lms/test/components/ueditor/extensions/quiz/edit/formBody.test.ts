/**
 * quiz edit formBody component test
 * @see modules/lms/components/ueditor/extensions/nodes/vue/quiz/edit/formBody.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'
import { QuizEditKey } from '../../../../../../components/ueditor/extensions/nodes/vue/quiz/useQuizEdit'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'placeholder', 'icon', 'size', 'disabled'],
  },
  UInputTags: { template: '<div class="uinput-tags" />', props: ['modelValue', 'placeholder', 'addText'] },
  UButton: { template: '<button @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label', 'loading'] },
  UIcon: { template: '<span />', props: ['name'] },
  UFormField: { template: '<div class="uform-field"><label>{{ label }}</label><slot /></div>', props: ['label', 'size'] },
  Monaco: { template: '<div class="monaco-stub" />', props: ['modelValue', 'language', 'autoFormat'] },
  richEditor: { template: '<div class="rich-editor-stub" />', props: ['modelValue'] },
}

function makeMockEditContext(overrides: any = {}) {
  const form = ref({
    name: 'Test Quiz',
    timeLimit: 600,
    submitLimit: 1,
    startAt: '',
    endAt: '',
    questions: [{ id: 1, point: 10 }],
    content: '',
  })
  return {
    t: (k: string) => k,
    form,
    totalPoint: ref(10),
    saving: ref(false),
    saveMsg: ref(''),
    saveOk: ref(true),
    showJsonEditor: ref(false),
    jsonText: ref(''),
    jsonError: ref(''),
    pickerOpen: ref(false),
    saveQuiz: () => {},
    ...overrides,
  }
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('quiz/edit/formBody.vue', () => {
  it('renders form with quiz name and config fields', async () => {
    const { default: FormBody } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/quiz/edit/formBody.vue'
    )
    const ctx = makeMockEditContext()
    const wrapper = mount(FormBody, {
      global: { ..._globalConfig, provide: { [QuizEditKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('Test Quiz')
    expect(wrapper.text()).toContain('quiz.timeLimit')
    expect(wrapper.text()).toContain('quiz.submitLimit')
  })

  it('shows questions count', async () => {
    const { default: FormBody } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/quiz/edit/formBody.vue'
    )
    const ctx = makeMockEditContext()
    const wrapper = mount(FormBody, {
      global: { ..._globalConfig, provide: { [QuizEditKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('quiz.questionsLabel')
    expect(wrapper.text()).toContain('(1)')
  })

  it('renders save button', async () => {
    const { default: FormBody } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/quiz/edit/formBody.vue'
    )
    const ctx = makeMockEditContext()
    const wrapper = mount(FormBody, {
      global: { ..._globalConfig, provide: { [QuizEditKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('common.save')
  })

  it('calls saveQuiz when save button clicked', async () => {
    const { default: FormBody } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/quiz/edit/formBody.vue'
    )
    let saveCalled = false
    const ctx = makeMockEditContext({ saveQuiz: () => { saveCalled = true } })
    const wrapper = mount(FormBody, {
      global: { ..._globalConfig, provide: { [QuizEditKey as any]: ctx } },
    })
    const buttons = wrapper.findAll('button')
    const saveBtn = buttons.find(b => b.text().includes('common.save'))
    await saveBtn!.trigger('click')
    expect(saveCalled).toBe(true)
  })
})
