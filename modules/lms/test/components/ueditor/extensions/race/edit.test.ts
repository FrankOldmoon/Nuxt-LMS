/**
 * race edit 组件测试
 * @see modules/lms/components/ueditor/extensions/nodes/vue/race/edit.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n, setMockLmsContext } from '../../../../../../../test/setup/nuxt-stubs'
import { useRaceEditContext } from '../../../../../components/ueditor/extensions/nodes/vue/race/useRaceEdit'

// form-content.vue (mounted by edit.vue) uses useRaceEditContext() without importing it (Nuxt auto-import)
;(globalThis as any).useRaceEditContext = useRaceEditContext

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
    props: ['modelValue', 'type', 'placeholder', 'icon', 'size'],
  },
  UButton: { template: '<button @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label', 'loading'] },
  UIcon: { template: '<span />', props: ['name'] },
  UFormField: { template: '<div><label>{{ label }}</label><slot /></div>', props: ['label', 'size'] },
  Monaco: { template: '<div class="monaco-stub" />', props: ['modelValue', 'language', 'autoFormat'] },
  UeditorContentPicker: { template: '<div v-if="modelValue" class="content-picker" />', props: ['modelValue', 'type'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('race/edit.vue', () => {
  it('renders inline panel when no modelValue', async () => {
    const { default: RaceEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/race/edit.vue'
    )
    const wrapper = mount(RaceEdit, {
      props: { raceId: 0, race: { name: 'Test Race', point: 100, gapTime: 30, questionIds: [] } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.p-6').exists()).toBe(true)
  })

  it('renders modal when modelValue=true', async () => {
    const { default: RaceEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/race/edit.vue'
    )
    const wrapper = mount(RaceEdit, {
      props: { modelValue: false, raceId: 1, race: { name: 'Test', point: 100, gapTime: 30, questionIds: [] } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal-stub').exists()).toBe(false)
    await wrapper.setProps({ modelValue: true })
    await flushPromises()
    expect(wrapper.find('.modal-stub').exists()).toBe(true)
  })

  it('shows race name in title', async () => {
    const { default: RaceEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/race/edit.vue'
    )
    const wrapper = mount(RaceEdit, {
      props: { raceId: 0, race: { name: 'My Race', point: 100, gapTime: 30, questionIds: [] } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('My Race')
  })
})
