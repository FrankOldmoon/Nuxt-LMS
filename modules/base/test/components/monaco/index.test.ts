/**
 * Monaco component tests
 * @see modules/base/components/monaco/index.vue
 *
 * Monaco editor wrapper: CDN loading + initialization + formatting
 * Depends on useMonacoEditor() composable (auto-import), stub injected via globalThis in tests
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
  // Stub useMonacoEditor composable (auto-import) to avoid loading Monaco CDN
  ;(globalThis as any).useMonacoEditor = (
    _modelValue: () => string,
    _language: () => string,
    _theme: () => string,
    _readOnly: () => boolean,
    _fontSize: () => number,
    _autoFormat: () => boolean,
    _formatOptions: () => any,
    _onUpdate: (val: string) => void,
    _onReady: (editor: any) => void,
  ) => ({
    editorContainer: ref<HTMLElement | null>(null),
    getEditor: () => null,
    getMonaco: () => null,
    formatCode: vi.fn(async () => {}),
  })
})

afterEach(() => {
  delete (globalThis as any).useMonacoEditor
})

// Stub ClientOnly (directly render slot, bypassing SSR restrictions)
const _globalStubs = {
  ClientOnly: { template: '<div class="client-only"><slot /></div>' },
}

const _globalConfig = {
  mocks: {
    $t: (k: string) => k,
    $i18n: { t: (k: string) => k, locale: { value: 'en' } },
  },
  stubs: _globalStubs,
}

describe('monaco/index.vue', () => {
  it('默认渲染：挂载容器元素', async () => {
    const { default: Monaco } = await import('../../../components/monaco/index.vue')
    const wrapper = mount(Monaco, {
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('div').exists()).toBe(true)
  })

  it('接受 modelValue prop', async () => {
    const { default: Monaco } = await import('../../../components/monaco/index.vue')
    const wrapper = mount(Monaco, {
      props: { modelValue: 'const x = 1;' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('modelValue')).toBe('const x = 1;')
  })

  it('language prop 默认为 html', async () => {
    const { default: Monaco } = await import('../../../components/monaco/index.vue')
    const wrapper = mount(Monaco, {
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('language')).toBe('html')
  })

  it('theme prop 默认为 vs-dark', async () => {
    const { default: Monaco } = await import('../../../components/monaco/index.vue')
    const wrapper = mount(Monaco, {
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('theme')).toBe('vs-dark')
  })

  it('接受 fontSize / readOnly / autoFormat props', async () => {
    const { default: Monaco } = await import('../../../components/monaco/index.vue')
    const wrapper = mount(Monaco, {
      props: {
        modelValue: '',
        language: 'javascript',
        theme: 'vs',
        readOnly: true,
        fontSize: 18,
        autoFormat: false,
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('fontSize')).toBe(18)
    expect(wrapper.props('readOnly')).toBe(true)
    expect(wrapper.props('autoFormat')).toBe(false)
  })

  it('formatOptions prop 默认值含 tabSize/insertSpaces', async () => {
    const { default: Monaco } = await import('../../../components/monaco/index.vue')
    const wrapper = mount(Monaco, {
      global: _globalConfig,
    })
    await flushPromises()
    const fo = wrapper.props('formatOptions')
    expect(fo.tabSize).toBe(2)
    expect(fo.insertSpaces).toBe(true)
    expect(fo.trimTrailingWhitespace).toBe(true)
    expect(fo.insertFinalNewline).toBe(true)
  })

  it('暴露 getEditor / getMonaco / formatCode 方法', async () => {
    const { default: Monaco } = await import('../../../components/monaco/index.vue')
    const wrapper = mount(Monaco, {
      global: _globalConfig,
    })
    await flushPromises()
    const vm: any = wrapper.vm
    expect(typeof vm.getEditor).toBe('function')
    expect(typeof vm.getMonaco).toBe('function')
    expect(typeof vm.formatCode).toBe('function')
  })
})
