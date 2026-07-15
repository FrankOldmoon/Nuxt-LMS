/**
 * lms/configEditor/index.vue component test
 * @see modules/lms/components/lms/configEditor/index.vue
 *
 * Config editor entry: calls useConfigEditor + provideConfigEditor, renders child components
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive, computed } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // stub useConfigEditor + provideConfigEditor
  const mockConfig = reactive({
    ai: { enabled: true, mode: 'api' },
    user: { allowSelfAvatarUpload: true },
  })
  const mockCtx = {
    config: mockConfig,
    aiModeOpts: [],
    ttsGenderOpts: [],
    defaultViewOpts: [],
    hideCourse: computed(() => false),
    getConfig: () => ({ ai: { enabled: true, mode: 'api' }, user: { allowSelfAvatarUpload: true } }),
  }
  ;(globalThis as any).useConfigEditor = () => mockCtx
  ;(globalThis as any).provideConfigEditor = vi.fn()
})

const _globalStubs = {
  USeparator: {
    template: '<div class="useparator">{{ label }}</div>',
    props: ['label'],
  },
  LmsConfigEditorUserSection: { template: '<div class="user-section" />' },
  LmsConfigEditorAiSection: { template: '<div class="ai-section" />' },
  LmsConfigEditorExpSections: { template: '<div class="exp-sections" />' },
  LmsConfigEditorSwitchSections: { template: '<div class="switch-sections" />' },
  LmsConfigEditorDanmakuSection: { template: '<div class="danmaku-section" />' },
  LmsConfigEditorGridSections: { template: '<div class="grid-sections" />' },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('lms/configEditor/index.vue', () => {
  it('组件能正常挂载', async () => {
    const { default: ConfigEditor } = await import('../../../../components/lms/configEditor/index.vue')
    const wrapper = mount(ConfigEditor, {
      props: { modelValue: null },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('渲染标题分隔线', async () => {
    const { default: ConfigEditor } = await import('../../../../components/lms/configEditor/index.vue')
    const wrapper = mount(ConfigEditor, {
      props: { modelValue: null },
      global: _globalConfig,
    })
    expect(wrapper.find('.useparator').exists()).toBe(true)
    expect(wrapper.text()).toContain('lmsConfig.title')
  })

  it('渲染所有子组件', async () => {
    const { default: ConfigEditor } = await import('../../../../components/lms/configEditor/index.vue')
    const wrapper = mount(ConfigEditor, {
      props: { modelValue: null },
      global: _globalConfig,
    })
    expect(wrapper.find('.user-section').exists()).toBe(true)
    expect(wrapper.find('.ai-section').exists()).toBe(true)
    expect(wrapper.find('.exp-sections').exists()).toBe(true)
    expect(wrapper.find('.switch-sections').exists()).toBe(true)
    expect(wrapper.find('.danmaku-section').exists()).toBe(true)
    expect(wrapper.find('.grid-sections').exists()).toBe(true)
  })

  it('接收 modelValue prop', async () => {
    const { default: ConfigEditor } = await import('../../../../components/lms/configEditor/index.vue')
    const wrapper = mount(ConfigEditor, {
      props: { modelValue: { ai: { enabled: false } } },
      global: _globalConfig,
    })
    expect(wrapper.props('modelValue')).toEqual({ ai: { enabled: false } })
  })

  it('接收 hideCourse prop 默认为 false', async () => {
    const { default: ConfigEditor } = await import('../../../../components/lms/configEditor/index.vue')
    const wrapper = mount(ConfigEditor, {
      props: { modelValue: null },
      global: _globalConfig,
    })
    expect(wrapper.props('hideCourse')).toBe(false)
  })

  it('暴露 getConfig 方法', async () => {
    const { default: ConfigEditor } = await import('../../../../components/lms/configEditor/index.vue')
    const wrapper = mount(ConfigEditor, {
      props: { modelValue: null },
      global: _globalConfig,
    })
    expect((wrapper.vm as any).getConfig).toBeDefined()
    const config = (wrapper.vm as any).getConfig()
    expect(config).toHaveProperty('ai')
  })
})
