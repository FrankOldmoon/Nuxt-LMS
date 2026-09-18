/**
 * auth/loginForm.vue 组件测试
 * @see modules/base/components/auth/loginForm.vue
 */
import {
  describe, it, expect, beforeEach, vi,
  mount, flushPromises,
  _globalConfig, baseBeforeEach,
  setMockFetchHandler, clearMockFetchHandler,
} from './_shared'

beforeEach(() => {
  baseBeforeEach()
  clearMockFetchHandler()
})

/** Helper: set allowRegistration in site-config state (used by useSiteConfig). */
function setAllowRegistration(value: boolean) {
  // useSiteConfig reads from useState('site-config'); manipulate it directly
  const config = (globalThis as any).useState('site-config', () => ({}))
  config.value = { ...config.value, allowRegistration: value }
}

describe('auth/loginForm.vue', () => {
  it('渲染登录表单（用户名 + 密码输入框）', async () => {
    const { default: LoginForm } = await import('../../../components/auth/loginForm.vue')
    const wrapper = mount(LoginForm, { global: _globalConfig })
    expect(wrapper.text()).toContain('auth.loginTitle')
    const inputs = wrapper.findAll('input')
    expect(inputs.length).toBeGreaterThanOrEqual(2)
    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
  })

  it('点击注册链接 emit switchToRegister', async () => {
    setAllowRegistration(true)
    const { default: LoginForm } = await import('../../../components/auth/loginForm.vue')
    const wrapper = mount(LoginForm, { global: _globalConfig })
    const buttons = wrapper.findAll('button')
    const registerBtn = buttons.find(b => b.text().includes('auth.register'))
    expect(registerBtn).toBeTruthy()
    await registerBtn!.trigger('click')
    expect(wrapper.emitted('switchToRegister')).toBeTruthy()
  })

  it('点击忘记密码链接 emit switchToForgotPassword', async () => {
    const { default: LoginForm } = await import('../../../components/auth/loginForm.vue')
    const wrapper = mount(LoginForm, { global: _globalConfig })
    const buttons = wrapper.findAll('button')
    const forgotBtn = buttons.find(b => b.text().includes('auth.forgotPassword'))
    expect(forgotBtn).toBeTruthy()
    await forgotBtn!.trigger('click')
    expect(wrapper.emitted('switchToForgotPassword')).toBeTruthy()
  })

  it('allowRegistration=false 时不渲染注册链接', async () => {
    setAllowRegistration(false)
    const { default: LoginForm } = await import('../../../components/auth/loginForm.vue')
    const wrapper = mount(LoginForm, { global: _globalConfig })
    expect(wrapper.text()).not.toContain('auth.noAccount')
  })

  it('allowRegistration=true 时渲染注册链接', async () => {
    setAllowRegistration(true)
    const { default: LoginForm } = await import('../../../components/auth/loginForm.vue')
    const wrapper = mount(LoginForm, { global: _globalConfig })
    expect(wrapper.text()).toContain('auth.noAccount')
  })

  it('点击登录后 3 秒冷却：期间禁用且再次提交被拦截，倒计时结束后恢复', async () => {
    vi.useFakeTimers()
    // loginForm 成功/失败提示走 useNuxtApp().$i18n.t，测试桩未提供 $i18n，这里补上
    const originalUseNuxtApp = (globalThis as any).useNuxtApp
    ;(globalThis as any).useNuxtApp = () => ({ $i18n: { t: (k: string) => k } })
    try {
      let loginCalls = 0
      setMockFetchHandler(async (url: string) => {
        if (String(url).includes('/api/auth/login')) {
          loginCalls++
          return { data: { user: { id: 1 }, token: 't' }, success: true, msg: '' }
        }
        return { data: null, success: true, msg: '' }
      })
      const { default: LoginForm } = await import('../../../components/auth/loginForm.vue')
      const wrapper = mount(LoginForm, { global: _globalConfig })
      const inputs = wrapper.findAll('input')
      await inputs[0].setValue('alice')
      await inputs[1].setValue('secret')

      const loginBtn = wrapper.findAll('button.ubtn').find(b => b.text().includes('auth.login'))!
      expect(loginBtn).toBeTruthy()

      // 首次提交：发起登录，进入冷却
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(loginCalls).toBe(1)
      expect(loginBtn.attributes('disabled')).toBeDefined()
      // 冷却期间只禁用，按钮文案不再显示倒计时数字
      expect(loginBtn.text()).not.toMatch(/\(\d+s\)/)

      // 冷却期内再次提交：被拦截
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(loginCalls).toBe(1)

      // 倒计时 3 秒结束，按钮恢复可用
      vi.advanceTimersByTime(3000)
      await flushPromises()
      expect(loginBtn.attributes('disabled')).toBeUndefined()

      // 再次提交：可以重新登录
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(loginCalls).toBe(2)
    } finally {
      ;(globalThis as any).useNuxtApp = originalUseNuxtApp
      vi.useRealTimers()
    }
  })
})
