/**
 * lms/configEditor/gridSections.vue component test
 * @see modules/lms/components/lms/configEditor/gridSections.vue
 *
 * Course list visibility config + cloud storage config
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  USwitch: {
    template: '<label class="uswitch"><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" /></label>',
    props: ['modelValue'],
  },
  UFormField: {
    template: '<div class="uform-field"><label v-if="label">{{ label }}</label><slot /><slot name="hint" /></div>',
    props: ['label', 'size'],
  },
  UInput: {
    template: '<input class="uinput" :value="modelValue" :type="type" :step="step" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'step', 'size'],
  },
  USelect: {
    template: '<select class="uselect" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="o in items" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
    props: ['modelValue', 'items', 'size'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

function setupContext() {
  const config = reactive({
    courseList: { showSearch: true, showFilter: true, showSort: true, defaultView: 'grid' },
    storage: { driveSize: 1073741824, teacherMultiplier: 1 },
  })
  const ctx = {
    config,
    defaultViewOpts: [
      { label: 'Grid', value: 'grid' },
      { label: 'List', value: 'list' },
    ],
  }
  ;(globalThis as any).useConfigEditorContext = () => ctx
  return ctx
}

describe('lms/configEditor/gridSections.vue', () => {
  it('渲染课程列表配置标题', async () => {
    setupContext()
    const { default: GridSections } = await import('../../../../components/lms/configEditor/gridSections.vue')
    const wrapper = mount(GridSections, { global: _globalConfig })
    expect(wrapper.text()).toContain('lmsConfig.courseList')
  })

  it('渲染 showSearch / showFilter / showSort 开关', async () => {
    setupContext()
    const { default: GridSections } = await import('../../../../components/lms/configEditor/gridSections.vue')
    const wrapper = mount(GridSections, { global: _globalConfig })
    expect(wrapper.text()).toContain('lmsConfig.showSearch')
    expect(wrapper.text()).toContain('lmsConfig.showFilter')
    expect(wrapper.text()).toContain('lmsConfig.showSort')
    // 3 switches
    expect(wrapper.findAll('.uswitch').length).toBe(3)
  })

  it('渲染 defaultView 选择器', async () => {
    setupContext()
    const { default: GridSections } = await import('../../../../components/lms/configEditor/gridSections.vue')
    const wrapper = mount(GridSections, { global: _globalConfig })
    expect(wrapper.text()).toContain('lmsConfig.defaultView')
    expect(wrapper.find('.uselect').exists()).toBe(true)
  })

  it('渲染网盘存储配置标题', async () => {
    setupContext()
    const { default: GridSections } = await import('../../../../components/lms/configEditor/gridSections.vue')
    const wrapper = mount(GridSections, { global: _globalConfig })
    expect(wrapper.text()).toContain('lmsConfig.storage')
  })

  it('渲染 driveSize 和 teacherMultiplier 输入框', async () => {
    setupContext()
    const { default: GridSections } = await import('../../../../components/lms/configEditor/gridSections.vue')
    const wrapper = mount(GridSections, { global: _globalConfig })
    expect(wrapper.text()).toContain('lmsConfig.driveSize')
    expect(wrapper.text()).toContain('lmsConfig.teacherMultiplier')
    const inputs = wrapper.findAll('.uinput')
    expect(inputs.length).toBe(2)
  })
})
