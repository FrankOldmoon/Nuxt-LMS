/**
 * homework edit formBody component test
 * @see modules/lms/components/ueditor/extensions/nodes/vue/homework/edit/formBody.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'
import { HomeworkEditKey } from '../../../../../../components/ueditor/extensions/nodes/vue/homework/useHomeworkEdit'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'placeholder', 'icon', 'size'],
  },
  UInputTags: { template: '<div class="uinput-tags" />', props: ['modelValue', 'placeholder', 'addText'] },
  UButton: { template: '<button @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label', 'loading'] },
  UIcon: { template: '<span />', props: ['name'] },
  Monaco: { template: '<div class="monaco-stub" />', props: ['modelValue', 'language', 'autoFormat'] },
  richEditor: { template: '<div class="rich-editor-stub" />', props: ['modelValue'] },
}

function makeMockEditContext(overrides: any = {}) {
  const form = ref({
    name: 'Test Homework',
    code: 'HW1',
    content: 'some content',
    point: 10,
    tags: [],
    explanation: 'answer explanation',
  })
  return {
    t: (k: string) => k,
    form,
    saving: ref(false),
    saveMsg: ref(''),
    saveOk: ref(true),
    showJsonEditor: ref(false),
    jsonText: ref(''),
    jsonError: ref(''),
    resetForm: () => {},
    saveHomework: () => {},
    ...overrides,
  }
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('homework/edit/formBody.vue', () => {
  it('renders form with title and fields', async () => {
    const { default: FormBody } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/homework/edit/formBody.vue'
    )
    const ctx = makeMockEditContext()
    const wrapper = mount(FormBody, {
      global: { ..._globalConfig, provide: { [HomeworkEditKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('common.edit')
    expect(wrapper.find('input').exists()).toBe(true)
  })

  it('renders save button', async () => {
    const { default: FormBody } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/homework/edit/formBody.vue'
    )
    const ctx = makeMockEditContext()
    const wrapper = mount(FormBody, {
      global: { ..._globalConfig, provide: { [HomeworkEditKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('common.save')
  })

  it('calls saveHomework when save button clicked', async () => {
    const { default: FormBody } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/homework/edit/formBody.vue'
    )
    let saveCalled = false
    const ctx = makeMockEditContext({ saveHomework: () => { saveCalled = true } })
    const wrapper = mount(FormBody, {
      global: { ..._globalConfig, provide: { [HomeworkEditKey as any]: ctx } },
    })
    const buttons = wrapper.findAll('button')
    const saveBtn = buttons.find(b => b.text().includes('common.save'))
    await saveBtn!.trigger('click')
    expect(saveCalled).toBe(true)
  })

  it('emits cancel when showCancel and cancel clicked', async () => {
    const { default: FormBody } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/homework/edit/formBody.vue'
    )
    const ctx = makeMockEditContext()
    const wrapper = mount(FormBody, {
      props: { showCancel: true },
      global: { ..._globalConfig, provide: { [HomeworkEditKey as any]: ctx } },
    })
    const buttons = wrapper.findAll('button')
    const cancelBtn = buttons.find(b => b.text().includes('common.cancel'))
    await cancelBtn!.trigger('click')
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })
})
