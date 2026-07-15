/**
 * formBody edit component test (edit)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/edit/formBody.vue
 *
 * formBody.vue uses useQuestionEditContext() (auto-imported inject from nuxt-stubs, NOT Vue's inject)
 * Because inject in useQuestionEdit.ts is auto-imported (not explicitly imported from 'vue')
 * Need to provide QuestionEditKey via globalProvide (nuxt-stubs Map-based)
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed, defineComponent, h } from 'vue'
import { resetAllStubs, setMockI18n, provide as globalProvide } from '../../../../../../../../test/setup/nuxt-stubs'
import { QuestionEditKey } from '../../../../../../components/ueditor/extensions/nodes/vue/question/useQuestionEdit'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder', 'size', 'type'],
    emits: ['update:modelValue'],
  },
  USelect: {
    template: '<select @change="$emit(\'update:modelValue\', $event.target.value); $emit(\'change\')"><option v-for="o in items" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
    props: ['modelValue', 'items', 'size'],
    emits: ['update:modelValue', 'change'],
  },
  UButton: { template: '<button @click="$emit(\'click\')">{{ label }}<slot /></button>', props: ['variant', 'size', 'color', 'icon', 'loading', 'label'] },
  UIcon: { template: '<span class="icon" />', props: ['name'] },
  UInputTags: { template: '<div class="input-tags" />', props: ['modelValue', 'placeholder', 'addText'] },
  richEditor: { template: '<div class="rich-editor" />', props: ['modelValue'] },
  Monaco: { template: '<div class="monaco" />', props: ['modelValue', 'language', 'autoFormat'] },
  AiGenerator: { template: '<div class="ai-generator" />', props: ['type'] },
}

const _mocks = { $t: (k: string) => k }

function makeEditCtx(overrides: any = {}) {
  const form = ref({
    name: 'Test Question',
    type: 'single',
    point: 5,
    content: 'Question content',
    options: ['', '', '', ''],
    answer: [0],
    explanation: 'Explanation text',
    tags: ['tag1'],
    ...overrides.form,
  })
  return {
    t: (k: string) => k,
    isModal: ref(false),
    open: ref(true),
    form,
    typeOptions: [
      { label: 'Single', value: 'single' },
      { label: 'Judge', value: 'judge' },
    ],
    typeComponent: computed(() => null),
    saving: ref(false),
    saveMsg: ref(''),
    saveOk: ref(true),
    showJsonEditor: ref(false),
    jsonText: ref('{}'),
    jsonError: ref(''),
    aiStreaming: ref(false),
    currentTypePrompt: computed(() => 'some prompt'),
    hasTypePrompt: computed(() => true),
    copyCopied: ref(false),
    AiGenerator: _globalStubs.AiGenerator,
    onTypeChange: () => {},
    resetForm: () => {},
    copyCurrentPrompt: () => {},
    saveQuestion: () => {},
    onAiStreaming: () => {},
    onAiStreamText: () => {},
    onAiGenerated: () => {},
    ...overrides,
  }
}

/** Wrapper component that provides the QuestionEditKey via global provide (nuxt-stubs Map) */
function makeProvider(ctxOverrides: any = {}) {
  const ctx = makeEditCtx(ctxOverrides)
  // useQuestionEditContext uses auto-imported inject (Map-based global stub)
  globalProvide(QuestionEditKey, ctx)
  return {
    ctx,
    Provider: defineComponent({
      setup(_, { slots }) {
        return () => slots.default?.()
      },
    }),
  }
}

describe('question/edit/formBody.vue', () => {
  it('mounts and renders formName input', async () => {
    const { default: FormBody } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/formBody.vue'
    )
    const { Provider } = makeProvider()
    const wrapper = mount({
      render() {
        return h(Provider, () => h(FormBody))
      },
    }, { global: { stubs: _globalStubs, mocks: _mocks } })
    // Should render title containing "common.edit"
    expect(wrapper.text()).toContain('common.edit')
  })

  it('renders save and reset buttons', async () => {
    const { default: FormBody } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/formBody.vue'
    )
    const { Provider } = makeProvider()
    const wrapper = mount({
      render() {
        return h(Provider, () => h(FormBody))
      },
    }, { global: { stubs: _globalStubs, mocks: _mocks } })
    expect(wrapper.text()).toContain('common.save')
    expect(wrapper.text()).toContain('common.reset')
  })

  it('renders content richEditor for non-html/non-composite types', async () => {
    const { default: FormBody } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/formBody.vue'
    )
    const { Provider } = makeProvider({ form: { type: 'single' } })
    const wrapper = mount({
      render() {
        return h(Provider, () => h(FormBody))
      },
    }, { global: { stubs: _globalStubs, mocks: _mocks } })
    // single type should render content richEditor + explanation richEditor = 2
    expect(wrapper.findAll('.rich-editor').length).toBeGreaterThanOrEqual(2)
  })
})
