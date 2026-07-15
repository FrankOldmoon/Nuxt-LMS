/**
 * auth/loginModal.vue component tests
 * @see modules/base/components/auth/loginModal.vue
 *
 * loginModal reads allowRegistration via useSiteConfig,
 * internally renders LoginForm / RegisterForm / ForgotPasswordForm based on activeTab.
 */
import {
  describe, it, expect, beforeEach,
  mount, flushPromises,
  _globalStubs, _globalConfig, baseBeforeEach,
} from './_shared'

beforeEach(() => {
  baseBeforeEach()
})

/** Helper: set allowRegistration in site-config state. */
function setAllowRegistration(value: boolean) {
  const config = (globalThis as any).useState('site-config', () => ({}))
  config.value = { ...config.value, allowRegistration: value }
}

const _stubs = {
  ..._globalStubs,
  AuthLoginForm: {
    template: '<div class="stub-login-form"><button class="emit-success" @click="$emit(\'success\')">ok</button></div>',
    emits: ['success', 'switchToRegister', 'switchToForgotPassword'],
  },
  AuthRegisterForm: {
    template: '<div class="stub-register-form"><button class="emit-success" @click="$emit(\'success\')">ok</button></div>',
    emits: ['success', 'switchToLogin'],
  },
  AuthForgotPasswordForm: {
    template: '<div class="stub-forgot-form" />',
    emits: ['switchToLogin'],
  },
}

describe('auth/loginModal.vue', () => {
  it('open=true 时默认显示 login tab', async () => {
    setAllowRegistration(true)
    const { default: LoginModal } = await import('../../../components/auth/loginModal.vue')
    const wrapper = mount(LoginModal, {
      props: { open: true },
      global: { ..._globalConfig, stubs: _stubs },
    })
    expect(wrapper.find('.stub-login-form').exists()).toBe(true)
    expect(wrapper.text()).toContain('auth.login')
  })

  it('allowRegistration=true 时渲染注册 tab 按钮', async () => {
    setAllowRegistration(true)
    const { default: LoginModal } = await import('../../../components/auth/loginModal.vue')
    const wrapper = mount(LoginModal, {
      props: { open: true },
      global: { ..._globalConfig, stubs: _stubs },
    })
    const tabButtons = wrapper.findAll('button')
    expect(tabButtons.some(b => b.text().includes('auth.register'))).toBe(true)
  })

  it('allowRegistration=false 时不渲染注册 tab 按钮', async () => {
    setAllowRegistration(false)
    const { default: LoginModal } = await import('../../../components/auth/loginModal.vue')
    const wrapper = mount(LoginModal, {
      props: { open: true },
      global: { ..._globalConfig, stubs: _stubs },
    })
    // Only login tab, no register tab
    const tabButtons = wrapper.findAll('button.flex-1')
    expect(tabButtons).toHaveLength(1)
    expect(tabButtons[0].text()).toContain('auth.login')
  })

  it('子表单 emit success 时关闭弹窗并 emit success', async () => {
    setAllowRegistration(true)
    const { default: LoginModal } = await import('../../../components/auth/loginModal.vue')
    const wrapper = mount(LoginModal, {
      props: { open: true },
      global: { ..._globalConfig, stubs: _stubs },
    })
    // Click the emit-success button inside the stub login form
    await wrapper.find('.emit-success').trigger('click')
    await flushPromises()
    expect(wrapper.emitted('success')).toBeTruthy()
    // The modal should close (v-model:open updated to false)
    const openEvents = wrapper.emitted('update:open')
    expect(openEvents).toBeTruthy()
    expect(openEvents![openEvents!.length - 1]).toEqual([false])
  })

  it('关闭后 activeTab 重置为 login', async () => {
    setAllowRegistration(true)
    const { default: LoginModal } = await import('../../../components/auth/loginModal.vue')
    const wrapper = mount(LoginModal, {
      props: { open: true },
      global: { ..._globalConfig, stubs: _stubs },
    })
    // Switch to register tab
    const tabButtons = wrapper.findAll('button.flex-1')
    const registerTab = tabButtons.find(b => b.text().includes('auth.register'))
    await registerTab!.trigger('click')
    expect(wrapper.find('.stub-register-form').exists()).toBe(true)
    // Close the modal
    await wrapper.setProps({ open: false })
    await flushPromises()
    // Reopen, should return to login tab
    await wrapper.setProps({ open: true })
    await flushPromises()
    expect(wrapper.find('.stub-login-form').exists()).toBe(true)
  })
})
