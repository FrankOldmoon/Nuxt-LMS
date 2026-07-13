/**
 * auth/settingsModal.vue 组件测试
 * @see modules/lms/components/auth/settingsModal.vue
 *
 * LMS 设置弹窗包装：包裹 base AuthSettingsModal，通过 slot 注入 LmsConfigEditor。
 * open 变 true 时拉取 /api/config/get，提交时调用 /api/lms-config/update。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n, setMockFetchHandler, clearMockFetchHandler } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  clearMockFetchHandler()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  AuthSettingsModal: {
    template: '<div class="auth-modal"><slot name="settings-extra" :on-save="(fn) => registerSave(fn)" /></div>',
    props: ['open'],
    setup() {
      const saveHandlers: any[] = []
      function registerSave(fn: any) { saveHandlers.push(fn) }
      return { saveHandlers, registerSave }
    },
  },
  LmsConfigEditor: {
    template: '<div class="lms-config-editor" />',
    props: ['modelValue'],
    setup() {
      return { getConfig: () => ({ ai: { mode: 'api' } }) }
    },
  },
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('auth/settingsModal.vue', () => {
  it('默认 mount（open=false）', async () => {
    const { default: SettingsModal } = await import('../../../components/auth/settingsModal.vue')
    const wrapper = mount(SettingsModal, { global: _globalConfig })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.auth-modal').exists()).toBe(true)
  })

  it('open=false 时不触发加载配置', async () => {
    let fetched = false
    setMockFetchHandler(async () => { fetched = true; return { data: null, success: true, msg: '' } })
    const { default: SettingsModal } = await import('../../../components/auth/settingsModal.vue')
    mount(SettingsModal, { global: _globalConfig })
    await flushPromises()
    expect(fetched).toBe(false)
  })

  it('open 从 false 变 true 时拉取 /api/config/get', async () => {
    let configUrlCalled = false
    setMockFetchHandler(async (url: string) => {
      if (url === '/api/config/get') {
        configUrlCalled = true
        return { data: { ai: { mode: 'api' } }, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { default: SettingsModal } = await import('../../../components/auth/settingsModal.vue')
    const wrapper = mount(SettingsModal, {
      props: { open: false },
      global: _globalConfig,
    })
    await wrapper.setProps({ open: true })
    await flushPromises()
    expect(configUrlCalled).toBe(true)
  })

  it('加载配置失败时静默兜底为空对象', async () => {
    setMockFetchHandler(async () => { throw new Error('network') })
    const { default: SettingsModal } = await import('../../../components/auth/settingsModal.vue')
    const wrapper = mount(SettingsModal, {
      props: { open: false },
      global: _globalConfig,
    })
    await wrapper.setProps({ open: true })
    await flushPromises()
    // 不报错，组件仍存在
    expect(wrapper.exists()).toBe(true)
  })

  it('渲染 LmsConfigEditor 子组件', async () => {
    setMockFetchHandler(async () => ({ data: { ai: {} }, success: true, msg: '' }))
    const { default: SettingsModal } = await import('../../../components/auth/settingsModal.vue')
    const wrapper = mount(SettingsModal, {
      props: { open: true },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.lms-config-editor').exists()).toBe(true)
  })
})
