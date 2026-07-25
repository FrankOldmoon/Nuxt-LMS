/**
 * ai/llm/settingsPanel.vue 组件测试
 * @see modules/lms/components/ai/llm/settingsPanel.vue
 *
 * LLM 设置面板：模式选择 + 本地模型/API/Ollama 配置 + 通用参数。
 * 依赖 useLlmContext() 注入上下文，测试中 stub 该 composable 返回 mock 对象。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, reactive } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

/** mock useLlmContext 返回的对象（与 useLlm 返回结构一致） */
function mockLlmContext(overrides: any = {}) {
  return {
    t: (k: string) => k,
    cfgMode: ref<'local' | 'api' | 'ollama'>('api'),
    cfgTitle: ref(''),
    cfgPreset: ref(''),
    cfgOpening: ref(''),
    cfgThinking: ref(false),
    cfgApiModel: ref(''),
    cfgOllamaUrl: ref('http://localhost:11434'),
    cfgOllamaModel: ref(''),
    cfgTtsGender: ref<'female' | 'male'>('female'),
    selectedLocalModel: ref(''),
    modeOptions: [
      { label: 'local', value: 'local' },
      { label: 'api', value: 'api' },
      { label: 'ollama', value: 'ollama' },
    ],
    genderOptions: [
      { label: 'female', value: 'female' },
      { label: 'male', value: 'male' },
    ],
    state: reactive({ ready: false, loading: false, progress: 0, loadedBytes: '0 MB', totalBytes: '', error: '' }),
    loadSelected: vi.fn(),
    unloadLLM: vi.fn(),
    LOCAL_LLM_MODELS: [{ label: 'Qwen 0.5B', value: 'qwen-0.5b' }],
    ...overrides,
  }
}

const _globalStubs = {
  UFormField: { template: '<div class="form-field"><span class="field-label">{{ label }}</span><slot /></div>', props: ['label', 'size', 'hint'] },
  USelect: {
    template: '<select class="uselect" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="o in items" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
    props: ['modelValue', 'items', 'size', 'disabled'],
  },
  UInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" :disabled="disabled" />',
    props: ['modelValue', 'placeholder', 'size', 'disabled'],
  },
  UTextarea: {
    template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'rows', 'size'],
  },
  UButton: {
    template: '<button :disabled="loading" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>',
    props: ['label', 'icon', 'color', 'variant', 'size', 'loading', 'disabled'],
  },
  USwitch: {
    template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
    props: ['modelValue'],
  },
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('ai/llm/settingsPanel.vue', () => {
  it('默认渲染（api 模式）：模式选择 + API 模型输入 + 通用参数', async () => {
    ;(globalThis as any).useLlmContext = () => mockLlmContext()
    const { default: Panel } = await import('../../../../components/ai/llm/settingsPanel.vue')
    const wrapper = mount(Panel, { global: _globalConfig })
    expect(wrapper.exists()).toBe(true)
    // 模式 select 一定存在
    expect(wrapper.find('select.uselect').exists()).toBe(true)
  })

  it('cfgMode=local 时渲染本地模型设置区', async () => {
    ;(globalThis as any).useLlmContext = () => mockLlmContext({ cfgMode: ref('local') })
    const { default: Panel } = await import('../../../../components/ai/llm/settingsPanel.vue')
    const wrapper = mount(Panel, { global: _globalConfig })
    // local 模式：显示"加载模型"按钮（state.ready=false, loading=false）
    expect(wrapper.text()).toContain('ai.loadModel')
  })

  it('cfgMode=ollama 时渲染 Ollama URL / Model 输入', async () => {
    ;(globalThis as any).useLlmContext = () => mockLlmContext({ cfgOllamaUrl: ref('http://localhost:11434') })
    // 切到 ollama：通过 mock 直接返回 ollama 模式
    ;(globalThis as any).useLlmContext = () => mockLlmContext({ cfgMode: ref('ollama') })
    const { default: Panel } = await import('../../../../components/ai/llm/settingsPanel.vue')
    const wrapper = mount(Panel, { global: _globalConfig })
    expect(wrapper.text()).toContain('ai.ollamaUrl')
    expect(wrapper.text()).toContain('ai.ollamaModel')
  })

  it('state.loading=true 时显示加载中图标文案', async () => {
    ;(globalThis as any).useLlmContext = () =>
      mockLlmContext({ cfgMode: ref('local'), state: reactive({ ready: false, loading: true, progress: 0, loadedBytes: '0 MB', totalBytes: '', error: '' }) })
    const { default: Panel } = await import('../../../../components/ai/llm/settingsPanel.vue')
    const wrapper = mount(Panel, { global: _globalConfig })
    expect(wrapper.text()).toContain('ai.loading')
  })

  it('state.ready=true 时显示卸载模型按钮', async () => {
    ;(globalThis as any).useLlmContext = () =>
      mockLlmContext({ cfgMode: ref('local'), state: reactive({ ready: true, loading: false, progress: 0, loadedBytes: '0 MB', totalBytes: '', error: '' }) })
    const { default: Panel } = await import('../../../../components/ai/llm/settingsPanel.vue')
    const wrapper = mount(Panel, { global: _globalConfig })
    expect(wrapper.text()).toContain('ai.unloadModel')
    expect(wrapper.text()).toContain('ai.loaded')
  })

  it('点击加载模型按钮调用 loadSelected', async () => {
    const ctx = mockLlmContext({ cfgMode: ref('local') })
    ;(globalThis as any).useLlmContext = () => ctx
    const { default: Panel } = await import('../../../../components/ai/llm/settingsPanel.vue')
    const wrapper = mount(Panel, { global: _globalConfig })
    // 找到 "ai.loadModel" 对应的按钮（label prop）
    const loadBtn = wrapper.findAll('button').find(b => b.text().includes('ai.loadModel'))
    expect(loadBtn).toBeTruthy()
    await loadBtn!.trigger('click')
    expect(ctx.loadSelected).toHaveBeenCalled()
  })
})
