/**
 * lms/configEditor/aiSection.vue 组件测试
 * @see modules/lms/components/lms/configEditor/aiSection.vue
 *
 * AI 助手配置：enabled 开关 + mode 选择 + api/ollama 模式字段
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
    template: '<input class="uinput" :value="modelValue" :type="type" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'placeholder', 'size'],
  },
  USelect: {
    template: '<select class="uselect" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="o in items" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
    props: ['modelValue', 'items', 'size'],
  },
  UTextarea: {
    template: '<textarea class="utextarea" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'rows', 'size'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

function setupContext(overrides: any = {}) {
  const config = reactive({
    ai: {
      enabled: true,
      mode: 'api',
      model: 'gpt-4',
      thinking: false,
      apiUrl: '/api/aichat/chat',
      llmApiUrl: 'https://api.openai.com',
      llmApiKey: 'sk-xxx',
      ollamaUrl: 'http://localhost:11434',
      ollamaModel: 'llama3.2',
      title: 'AI Assistant',
      preset: 'You are a teacher',
      opening: 'Hello!',
      ttsGender: 'female',
    },
    ...overrides,
  })
  const ctx = {
    config,
    aiModeOpts: [
      { label: 'API', value: 'api' },
      { label: 'Local', value: 'local' },
      { label: 'Ollama', value: 'ollama' },
    ],
    ttsGenderOpts: [
      { label: 'Female', value: 'female' },
      { label: 'Male', value: 'male' },
    ],
  }
  ;(globalThis as any).useConfigEditorContext = () => ctx
  return ctx
}

describe('lms/configEditor/aiSection.vue', () => {
  it('渲染 AI 配置标题', async () => {
    setupContext()
    const { default: AiSection } = await import('../../../../components/lms/configEditor/aiSection.vue')
    const wrapper = mount(AiSection, { global: _globalConfig })
    expect(wrapper.text()).toContain('lmsConfig.ai')
  })

  it('渲染 aiEnabled 开关', async () => {
    setupContext()
    const { default: AiSection } = await import('../../../../components/lms/configEditor/aiSection.vue')
    const wrapper = mount(AiSection, { global: _globalConfig })
    expect(wrapper.text()).toContain('lmsConfig.aiEnabled')
    expect(wrapper.find('.uswitch').exists()).toBe(true)
  })

  it('mode=api 时显示 API 相关字段', async () => {
    setupContext()
    const { default: AiSection } = await import('../../../../components/lms/configEditor/aiSection.vue')
    const wrapper = mount(AiSection, { global: _globalConfig })
    expect(wrapper.text()).toContain('lmsConfig.aiModel')
    expect(wrapper.text()).toContain('lmsConfig.aiLlmApiUrl')
    expect(wrapper.text()).toContain('lmsConfig.aiLlmApiKey')
    expect(wrapper.text()).toContain('lmsConfig.aiThinking')
  })

  it('mode=ollama 时显示 Ollama 相关字段', async () => {
    setupContext({ ai: { mode: 'ollama', enabled: true, ollamaUrl: '', ollamaModel: '', apiUrl: '', title: '', preset: '', opening: '', ttsGender: 'female' } })
    const { default: AiSection } = await import('../../../../components/lms/configEditor/aiSection.vue')
    const wrapper = mount(AiSection, { global: _globalConfig })
    expect(wrapper.text()).toContain('lmsConfig.aiOllamaUrl')
    expect(wrapper.text()).toContain('lmsConfig.aiOllamaModel')
    // api 模式字段不显示
    expect(wrapper.text()).not.toContain('lmsConfig.aiLlmApiKey')
  })

  it('mode=local 时隐藏 api 和 ollama 字段', async () => {
    setupContext({ ai: { mode: 'local', enabled: true, apiUrl: '', title: '', preset: '', opening: '', ttsGender: 'female' } })
    const { default: AiSection } = await import('../../../../components/lms/configEditor/aiSection.vue')
    const wrapper = mount(AiSection, { global: _globalConfig })
    expect(wrapper.text()).not.toContain('lmsConfig.aiLlmApiKey')
    expect(wrapper.text()).not.toContain('lmsConfig.aiOllamaUrl')
  })

  it('渲染通用字段（apiUrl, title, preset, opening）', async () => {
    setupContext()
    const { default: AiSection } = await import('../../../../components/lms/configEditor/aiSection.vue')
    const wrapper = mount(AiSection, { global: _globalConfig })
    expect(wrapper.text()).toContain('lmsConfig.aiApiUrl')
    expect(wrapper.text()).toContain('lmsConfig.aiTitle')
    expect(wrapper.text()).toContain('lmsConfig.aiPreset')
    expect(wrapper.text()).toContain('lmsConfig.aiOpening')
  })
})
