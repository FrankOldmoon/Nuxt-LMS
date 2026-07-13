/**
 * homework submit-section 组件测试
 * @see modules/lms/components/ueditor/extensions/nodes/vue/homework/render/submit-section.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'
import { HomeworkRenderKey } from '../../../../../../components/ueditor/extensions/nodes/vue/homework/useHomeworkRender'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  richEditor: { template: '<div class="rich-editor" />', props: ['modelValue', 'placeholder', 'pasteable'] },
  FormInputFile: { template: '<input type="file" />', props: ['modelValue', 'multiple', 'placeholder'] },
  ueditorRender: { template: '<div class="ueditor-render" />', props: ['json', 'courseId'] },
  UButton: { template: '<button :disabled="disabled" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label', 'loading', 'disabled'] },
  UIcon: { template: '<span />', props: ['name'] },
}

function makeMockContext(overrides: any = {}) {
  return {
    t: (k: string) => k,
    effectiveCourseId: ref(1),
    submittedContent: ref(''),
    submittedFiles: ref([]),
    submitted: ref(false),
    submittedFileList: ref([]),
    submitting: ref(false),
    submitMsg: ref(''),
    submitOk: ref(true),
    onSubmit: () => {},
    onReset: () => {},
    isRichDoc: (c: any) => c && typeof c === 'object' && !Array.isArray(c) && !!c.type,
    ...overrides,
  }
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('homework/render/submit-section.vue', () => {
  it('renders submit area with content label and upload label', async () => {
    const { default: SubmitSection } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/homework/render/submit-section.vue'
    )
    const ctx = makeMockContext()
    const wrapper = mount(SubmitSection, {
      global: { ..._globalConfig, provide: { [HomeworkRenderKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('homework.contentLabel')
    expect(wrapper.text()).toContain('homework.uploadLabel')
  })

  it('shows submit button', async () => {
    const { default: SubmitSection } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/homework/render/submit-section.vue'
    )
    const ctx = makeMockContext()
    const wrapper = mount(SubmitSection, {
      global: { ..._globalConfig, provide: { [HomeworkRenderKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('homework.submit')
  })

  it('shows resubmit when already submitted', async () => {
    const { default: SubmitSection } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/homework/render/submit-section.vue'
    )
    const ctx = makeMockContext({ submitted: ref(true) })
    const wrapper = mount(SubmitSection, {
      global: { ..._globalConfig, provide: { [HomeworkRenderKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('homework.resubmit')
    expect(wrapper.text()).toContain('homework.submitSuccess')
  })

  it('calls onSubmit when submit button clicked', async () => {
    const { default: SubmitSection } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/homework/render/submit-section.vue'
    )
    let submitted = false
    // Set submittedFiles to non-empty so the submit button is not disabled
    const ctx = makeMockContext({ onSubmit: () => { submitted = true }, submittedFiles: ref(['file.pdf']) })
    const wrapper = mount(SubmitSection, {
      global: { ..._globalConfig, provide: { [HomeworkRenderKey as any]: ctx } },
    })
    const buttons = wrapper.findAll('button')
    const submitBtn = buttons.find(b => b.text().includes('homework.submit'))
    await submitBtn!.trigger('click')
    expect(submitted).toBe(true)
  })
})
