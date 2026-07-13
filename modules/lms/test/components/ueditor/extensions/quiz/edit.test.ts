/**
 * quiz edit 组件测试
 * @see modules/lms/components/ueditor/extensions/nodes/vue/quiz/edit.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n, setMockLmsContext } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  setMockLmsContext(1, 1)
})

const _globalStubs = {
  UModal: {
    template: '<div v-if="open" class="modal-stub"><slot name="content" /></div>',
    props: ['open', 'scrollable', 'ui'],
  },
  UInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'placeholder', 'icon', 'size', 'disabled'],
  },
  UInputTags: { template: '<div class="uinput-tags" />', props: ['modelValue', 'placeholder', 'addText'] },
  UButton: { template: '<button @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label', 'loading'] },
  UIcon: { template: '<span />', props: ['name'] },
  UFormField: { template: '<div><label>{{ label }}</label><slot /></div>', props: ['label', 'size'] },
  Monaco: { template: '<div class="monaco-stub" />', props: ['modelValue', 'language', 'autoFormat'] },
  richEditor: { template: '<div class="rich-editor-stub" />', props: ['modelValue'] },
  UeditorContentPicker: { template: '<div v-if="modelValue" class="content-picker" />', props: ['modelValue', 'type'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('quiz/edit.vue', () => {
  it('renders inline panel when no modelValue', async () => {
    const { default: QuizEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/quiz/edit.vue'
    )
    const wrapper = mount(QuizEdit, {
      props: { quizId: 0, quiz: { name: 'Test Quiz', timeLimit: 600, submitLimit: 1, questions: [], content: '' } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.p-6').exists()).toBe(true)
  })

  it('renders modal when modelValue=true', async () => {
    const { default: QuizEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/quiz/edit.vue'
    )
    const wrapper = mount(QuizEdit, {
      props: { modelValue: false, quizId: 1, quiz: { name: 'Test', timeLimit: 600, submitLimit: 1, questions: [], content: '' } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal-stub').exists()).toBe(false)
    await wrapper.setProps({ modelValue: true })
    await flushPromises()
    expect(wrapper.find('.modal-stub').exists()).toBe(true)
  })

  it('shows quiz name in title', async () => {
    const { default: QuizEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/quiz/edit.vue'
    )
    const wrapper = mount(QuizEdit, {
      props: { quizId: 0, quiz: { name: 'My Quiz', timeLimit: 600, submitLimit: 1, questions: [], content: '' } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('My Quiz')
  })
})
