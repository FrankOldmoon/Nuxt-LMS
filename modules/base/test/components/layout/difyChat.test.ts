/**
 * layout/difyChat.vue 组件测试
 * @see modules/base/components/layout/difyChat.vue
 *
 * 右下角 Dify 悬浮聊天机器人：登录后全站注入，登出后清理。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import { resetAllStubs, setMockI18n, setMockAuthUser, setMockRuntimeConfig } from '../../../../../test/setup/nuxt-stubs'

const SCRIPT_ID = 'dify-chatbot-script'
const MOCK_DIFY_TOKEN = 'test-dify-token'
const MOCK_DIFY_BASE_URL = 'http://10.28.1.153'

beforeEach(() => {
  resetAllStubs()
  clearMockAuth()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  setMockRuntimeConfig({ public: { difyToken: MOCK_DIFY_TOKEN, difyBaseUrl: MOCK_DIFY_BASE_URL } })
  // 清理可能残留的脚本与全局配置
  document.getElementById(SCRIPT_ID)?.remove()
  document.getElementById('dify-chatbot-bubble-button')?.remove()
  document.getElementById('dify-chatbot-bubble-window')?.remove()
  delete (window as any).difyChatbotConfig
})

const _globalConfig = {
  mocks: { $t: (k: string) => k },
}

describe('layout/difyChat.vue', () => {
  it('未登录时不注入脚本', async () => {
    const { default: DifyChat } = await import('../../../components/layout/difyChat.vue')
    mount(DifyChat, { global: _globalConfig })
    expect(document.getElementById(SCRIPT_ID)).toBeNull()
    expect((window as any).difyChatbotConfig).toBeUndefined()
  })

  it('登录后注入 Dify 脚本并写入全局配置（含 user_id）', async () => {
    setMockAuthUser({ id: 42, name: 'TestUser' }, [{ code: 'student' }], [])
    const { default: DifyChat } = await import('../../../components/layout/difyChat.vue')
    mount(DifyChat, { global: _globalConfig })
    expect(document.getElementById(SCRIPT_ID)).toBeTruthy()
    expect((window as any).difyChatbotConfig?.baseUrl).toBe(MOCK_DIFY_BASE_URL)
    expect((window as any).difyChatbotConfig?.token).toBe(MOCK_DIFY_TOKEN)
    // user_id 带「每次页面加载唯一」的后缀，让 Dify 每次刷新都开新会话（不续旧会话历史）
    expect((window as any).difyChatbotConfig?.systemVariables?.user_id).toMatch(/^42_[a-z0-9]+$/)
  })

  it('登出时清理脚本与配置', async () => {
    // 用可控 ref 模拟登出（nuxt-stubs 的 _mockAuthUser 是非响应式普通变量，无法触发 computed 更新）
    const isLoggedIn = ref(true)
    const user = ref({ id: 1, name: 'TestUser' })
    ;(globalThis as any).useAuth = () => ({ user, isLoggedIn })
    const { default: DifyChat } = await import('../../../components/layout/difyChat.vue')
    mount(DifyChat, { global: _globalConfig })
    expect(document.getElementById(SCRIPT_ID)).toBeTruthy()

    isLoggedIn.value = false
    await nextTick()
    expect(document.getElementById(SCRIPT_ID)).toBeNull()
    expect((window as any).difyChatbotConfig).toBeUndefined()
  })

  it('重复挂载不重复注入脚本', async () => {
    // 显式覆盖 useAuth（登出测试会污染 globalThis.useAuth）
    ;(globalThis as any).useAuth = () => ({ user: ref({ id: 1, name: 'TestUser' }), isLoggedIn: ref(true) })
    const { default: DifyChat } = await import('../../../components/layout/difyChat.vue')
    const wrapper = mount(DifyChat, { global: _globalConfig })
    mount(DifyChat, { global: _globalConfig })
    expect(document.querySelectorAll(`#${SCRIPT_ID}`).length).toBe(1)
    wrapper.unmount()
  })
})
