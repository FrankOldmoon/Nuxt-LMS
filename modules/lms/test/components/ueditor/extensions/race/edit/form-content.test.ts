/**
 * race edit form-content component test
 * @see modules/lms/components/ueditor/extensions/nodes/vue/race/edit/form-content.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'
import { RaceEditKey, useRaceEditContext } from '../../../../../../components/ueditor/extensions/nodes/vue/race/useRaceEdit'

// form-content.vue uses useRaceEditContext() without importing it (Nuxt auto-import)
;(globalThis as any).useRaceEditContext = useRaceEditContext

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'placeholder', 'icon', 'size'],
  },
  UButton: { template: '<button @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label'] },
  UIcon: { template: '<span />', props: ['name'] },
  UFormField: { template: '<div class="uform-field"><label>{{ label }}</label><slot /></div>', props: ['label', 'size'] },
  Monaco: { template: '<div class="monaco-stub" />', props: ['modelValue', 'language', 'autoFormat'] },
}

function makeMockEditContext(overrides: any = {}) {
  const form = ref({
    name: 'Test Race',
    point: 100,
    gapTime: 30,
    questionIds: [{ id: 1 }, { id: 2 }],
  })
  return {
    t: (k: string) => k,
    form,
    pickerOpen: ref(false),
    showJsonEditor: ref(false),
    jsonText: ref(''),
    jsonError: ref(''),
    ...overrides,
  }
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('race/edit/form-content.vue', () => {
  it('renders form with race config fields', async () => {
    const { default: FormContent } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/race/edit/form-content.vue'
    )
    const ctx = makeMockEditContext()
    const wrapper = mount(FormContent, {
      global: { ..._globalConfig, provide: { [RaceEditKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('race.namePlaceholder')
    expect(wrapper.text()).toContain('race.point')
    expect(wrapper.text()).toContain('race.gapTime')
  })

  it('shows questions count', async () => {
    const { default: FormContent } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/race/edit/form-content.vue'
    )
    const ctx = makeMockEditContext()
    const wrapper = mount(FormContent, {
      global: { ..._globalConfig, provide: { [RaceEditKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('race.questionsLabel')
    expect(wrapper.text()).toContain('(2)')
  })

  it('shows noQuestions when questionIds is empty', async () => {
    const { default: FormContent } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/race/edit/form-content.vue'
    )
    const ctx = makeMockEditContext({ form: ref({ name: '', point: 100, gapTime: 30, questionIds: [] }) })
    const wrapper = mount(FormContent, {
      global: { ..._globalConfig, provide: { [RaceEditKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('race.noQuestions')
  })
})
