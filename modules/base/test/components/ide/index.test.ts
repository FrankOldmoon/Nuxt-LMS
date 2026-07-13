/**
 * Ide 组件测试
 * @see modules/base/components/ide/index.vue
 *
 * 在线 IDE 主容器：工具栏 + Monaco 编辑器 + 输入面板 + 输出面板
 * 依赖 useIde() composable（Nuxt auto-import），测试中通过 globalThis 注入桩
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, computed } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({
    locale: { value: 'en' },
    t: (k: string) => k,
    d: (v: any) => String(v),
  })
  // 桩 useIde composable（auto-import），避免加载 Pyodide/Worker 等重依赖
  ;(globalThis as any).useIde = (
    _modelValue: () => string,
    _language: () => string,
    _onUpdate: (val: string) => void,
  ) => ({
    t: (k: string) => k,
    langItems: computed(() => [
      { label: 'Python', value: 'python' },
      { label: 'JavaScript', value: 'javascript' },
    ]),
    currentLang: ref('python'),
    monacoLanguage: computed(() => 'python'),
    code: ref('print("hello")'),
    inputText: ref(''),
    output: ref(''),
    running: ref(false),
    currentRunner: computed(() => ({ ready: ref(true), loadingLabel: '' })),
    runnerReady: computed(() => true),
    runCode: vi.fn(),
    clearOutput: vi.fn(),
  })
})

afterEach(() => {
  delete (globalThis as any).useIde
})

// 桩子组件，避免递归加载 Monaco / 重依赖
const _globalStubs = {
  IdeToolbar: {
    name: 'IdeToolbar',
    template: '<div class="ide-toolbar-stub" :data-runner-ready="String(runnerReady)" :data-running="String(running)" :data-lang-count="langItems ? langItems.length : 0"><slot /></div>',
    props: ['lang', 'langItems', 'runnerReady', 'running', 'loadingLabel'],
    emits: ['update:lang', 'run', 'clear'],
  },
  Monaco: {
    template: '<div class="monaco-stub" />',
    props: ['modelValue', 'language', 'theme', 'fontSize'],
    emits: ['update:modelValue'],
  },
  IdeInputPanel: {
    template: '<div class="ide-input-stub" />',
    props: ['input'],
    emits: ['update:input'],
  },
  IdeOutputPanel: {
    template: '<div class="ide-output-stub">{{ output }}</div>',
    props: ['output'],
  },
}

const _globalConfig = {
  mocks: {
    $t: (k: string) => k,
    $i18n: { t: (k: string) => k, locale: { value: 'en' } },
  },
  stubs: _globalStubs,
}

describe('ide/index.vue', () => {
  it('默认渲染：包含工具栏、编辑器、输入面板、输出面板四个区域', async () => {
    const { default: Ide } = await import('../../../components/ide/index.vue')
    const wrapper = mount(Ide, {
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.ide-toolbar-stub').exists()).toBe(true)
    expect(wrapper.find('.monaco-stub').exists()).toBe(true)
    expect(wrapper.find('.ide-input-stub').exists()).toBe(true)
    expect(wrapper.find('.ide-output-stub').exists()).toBe(true)
  })

  it('接受 modelValue prop', async () => {
    const { default: Ide } = await import('../../../components/ide/index.vue')
    const wrapper = mount(Ide, {
      props: { modelValue: 'print(1)', language: 'python' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('modelValue')).toBe('print(1)')
  })

  it('接受 language prop（默认 python）', async () => {
    const { default: Ide } = await import('../../../components/ide/index.vue')
    const wrapper = mount(Ide, {
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('language')).toBe('python')
  })

  it('language prop 可设置为 javascript', async () => {
    const { default: Ide } = await import('../../../components/ide/index.vue')
    const wrapper = mount(Ide, {
      props: { language: 'javascript' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('language')).toBe('javascript')
  })

  it('IdeToolbar 接收 runnerReady/running/langItems props', async () => {
    const { default: Ide } = await import('../../../components/ide/index.vue')
    const wrapper = mount(Ide, {
      props: { modelValue: '', language: 'python' },
      global: _globalConfig,
    })
    await flushPromises()
    const toolbar = wrapper.find('.ide-toolbar-stub')
    expect(toolbar.exists()).toBe(true)
    expect(toolbar.attributes('data-runner-ready')).toBe('true')
    expect(toolbar.attributes('data-running')).toBe('false')
    expect(toolbar.attributes('data-lang-count')).toBe('2')
  })

  it('容器结构包含 ide-container / editor-area / bottom-area', async () => {
    const { default: Ide } = await import('../../../components/ide/index.vue')
    const wrapper = mount(Ide, {
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.ide-container').exists()).toBe(true)
    expect(wrapper.find('.ide-editor-area').exists()).toBe(true)
    expect(wrapper.find('.ide-bottom-area').exists()).toBe(true)
  })
})
