/**
 * auth/forgotPasswordForm.vue component tests
 * @see modules/base/components/auth/forgotPasswordForm.vue
 */
import {
  describe, it, expect, beforeEach,
  mount, flushPromises,
  _globalStubs, _globalConfig, baseBeforeEach,
  setMockFetchHandler, clearMockFetchHandler,
} from './_shared'

beforeEach(() => {
  baseBeforeEach()
  clearMockFetchHandler()
})

describe('auth/forgotPasswordForm.vue', () => {
  it('渲染标题和邮箱输入框', async () => {
    const { default: ForgotPasswordForm } = await import('../../../components/auth/forgotPasswordForm.vue')
    const wrapper = mount(ForgotPasswordForm, { global: _globalConfig })
    expect(wrapper.text()).toContain('auth.forgotPasswordTitle')
    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
  })

  it('点击返回登录链接 emit switchToLogin', async () => {
    const { default: ForgotPasswordForm } = await import('../../../components/auth/forgotPasswordForm.vue')
    const wrapper = mount(ForgotPasswordForm, { global: _globalConfig })
    const buttons = wrapper.findAll('button')
    const backBtn = buttons.find(b => b.text().includes('auth.backToLogin'))
    expect(backBtn).toBeTruthy()
    await backBtn!.trigger('click')
    expect(wrapper.emitted('switchToLogin')).toBeTruthy()
  })

  it('提交成功后显示发送成功提示', async () => {
    setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
    const { default: ForgotPasswordForm } = await import('../../../components/auth/forgotPasswordForm.vue')
    const wrapper = mount(ForgotPasswordForm, { global: _globalConfig })
    await wrapper.find('input').setValue('test@example.com')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('auth.resetEmailSent')
    expect(wrapper.text()).toContain('test@example.com')
  })

  it('邮箱为空时不提交', async () => {
    const { default: ForgotPasswordForm } = await import('../../../components/auth/forgotPasswordForm.vue')
    const wrapper = mount(ForgotPasswordForm, { global: _globalConfig })
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).not.toContain('auth.resetEmailSent')
  })
})
