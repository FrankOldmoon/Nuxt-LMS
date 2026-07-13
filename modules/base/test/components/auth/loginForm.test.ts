/**
 * auth/loginForm.vue 组件测试
 * @see modules/base/components/auth/loginForm.vue
 */
import {
  describe, it, expect, beforeEach,
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
})
