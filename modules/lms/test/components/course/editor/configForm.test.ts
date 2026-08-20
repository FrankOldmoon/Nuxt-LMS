/**
 * course/editor/configForm.vue 组件测试
 * @see modules/lms/components/course/editor/configForm.vue
 *
 * Display tab：基本信息（name/code/tags）+ 显示配置（icon/color/level/extraConfig/lmsConfig）
 * 重点测试：基本信息字段已从原 Basic Info tab 并入 Display
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // stub useCourseConfigFormContext（index.vue 已 provide form/config 等）
  ;(globalThis as any).useCourseConfigFormContext = () => ({
    form: ref({ name: 'Test Course', code: 'T-001', tags: ['tag1', 'tag2'] }),
    config: ref({ icon: '', color: 'primary', level: 'Beginner' }),
    extraConfigText: ref('{}'),
    extraConfigError: ref(''),
    lmsConfigRef: ref(null),
    lmsConfig: ref(null),
    colorOpts: [],
    levelOpts: [],
    initFromConfig: vi.fn(),
    buildConfig: vi.fn(() => ({})),
  })
})

const _globalStubs = {
  USeparator: { template: '<div class="useparator" />', props: ['label'] },
  UFormField: {
    template: '<div class="uform-field"><label v-if="label">{{ label }}</label><slot /></div>',
    props: ['label'],
  },
  UInput: {
    template: '<input class="uinput" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder'],
  },
  UInputTags: { template: '<div class="uinput-tags" />', props: ['modelValue', 'placeholder'] },
  USelect: { template: '<select class="uselect" />', props: ['modelValue', 'items'] },
  UTextarea: { template: '<textarea class="utextarea" :value="modelValue" />', props: ['modelValue', 'rows'] },
  LmsConfigEditor: { template: '<div class="lms-config-editor" />' },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('course/editor/configForm.vue', () => {
  it('Display tab 渲染基本信息字段（name/code/tags）', async () => {
    const { default: ConfigForm } = await import('../../../../components/course/editor/configForm.vue')
    const wrapper = mount(ConfigForm, { global: _globalConfig })
    await flushPromises()
    const inputs = wrapper.findAll('.uinput')
    // name + code + icon 三个文本框（icon 为显示配置项）
    expect(inputs).toHaveLength(3)
    expect(inputs[0].attributes('value')).toBe('Test Course')
    expect(inputs[1].attributes('value')).toBe('T-001')
    // tags 输入（UInputTags）
    expect(wrapper.find('.uinput-tags').exists()).toBe(true)
    // 显示配置项仍在
    expect(wrapper.find('.uselect').exists()).toBe(true)
    expect(wrapper.find('.utextarea').exists()).toBe(true)
  })

  it('基本信息字段可编辑并同步到 form', async () => {
    const { default: ConfigForm } = await import('../../../../components/course/editor/configForm.vue')
    const wrapper = mount(ConfigForm, { global: _globalConfig })
    await flushPromises()
    const input = wrapper.find('.uinput')
    await input.setValue('New Name')
    await flushPromises()
    expect(input.attributes('value')).toBe('New Name')
  })
})
