/**
 * auth/registerForm.vue 组件测试
 * @see modules/base/components/auth/registerForm.vue
 */
import {
  describe, it, expect, beforeEach,
  mount, flushPromises,
  _globalConfig, baseBeforeEach,
} from './_shared'

beforeEach(() => {
  baseBeforeEach()
})

describe('auth/registerForm.vue', () => {
  it('渲染注册表单标题和副标题', async () => {
    const { default: RegisterForm } = await import('../../../components/auth/registerForm.vue')
    const wrapper = mount(RegisterForm, { global: _globalConfig })
    expect(wrapper.text()).toContain('auth.registerTitle')
    expect(wrapper.text()).toContain('auth.registerSubtitle')
  })

  it('渲染所有必填输入字段', async () => {
    const { default: RegisterForm } = await import('../../../components/auth/registerForm.vue')
    const wrapper = mount(RegisterForm, { global: _globalConfig })
    const inputs = wrapper.findAll('input')
    // username, name, email, password, confirmPassword = 5 inputs
    expect(inputs).toHaveLength(5)
    // 2 password fields
    expect(wrapper.findAll('input[type="password"]')).toHaveLength(2)
    // 1 email field
    expect(wrapper.findAll('input[type="email"]')).toHaveLength(1)
  })

  it('点击已有账号链接 emit switchToLogin', async () => {
    const { default: RegisterForm } = await import('../../../components/auth/registerForm.vue')
    const wrapper = mount(RegisterForm, { global: _globalConfig })
    const buttons = wrapper.findAll('button')
    const loginBtn = buttons.find(b => b.text().includes('auth.login'))
    expect(loginBtn).toBeTruthy()
    await loginBtn!.trigger('click')
    expect(wrapper.emitted('switchToLogin')).toBeTruthy()
  })

  it('渲染提交按钮', async () => {
    const { default: RegisterForm } = await import('../../../components/auth/registerForm.vue')
    const wrapper = mount(RegisterForm, { global: _globalConfig })
    const submitBtn = wrapper.find('button.ubtn[type="submit"], form button.ubtn')
    // UForm stub renders <form>; the submit UButton is inside
    const allButtons = wrapper.findAll('button')
    expect(allButtons.some(b => b.text().includes('auth.register'))).toBe(true)
  })
})
