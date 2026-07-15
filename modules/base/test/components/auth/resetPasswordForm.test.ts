/**
 * auth/resetPasswordForm.vue component tests
 * @see modules/base/components/auth/resetPasswordForm.vue
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

describe('auth/resetPasswordForm.vue', () => {
  it('token 为空时显示无效 token 提示', async () => {
    const { default: ResetPasswordForm } = await import('../../../components/auth/resetPasswordForm.vue')
    const wrapper = mount(ResetPasswordForm, {
      props: { token: '' },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('auth.invalidResetToken')
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('提供 token 时渲染重置密码表单', async () => {
    const { default: ResetPasswordForm } = await import('../../../components/auth/resetPasswordForm.vue')
    const wrapper = mount(ResetPasswordForm, {
      props: { token: 'valid-token-123' },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('auth.resetPasswordTitle')
    expect(wrapper.find('form').exists()).toBe(true)
    const inputs = wrapper.findAll('input[type="password"]')
    expect(inputs).toHaveLength(2)
  })

  it('两次密码不一致时显示 mismatch 错误', async () => {
    const { default: ResetPasswordForm } = await import('../../../components/auth/resetPasswordForm.vue')
    const wrapper = mount(ResetPasswordForm, {
      props: { token: 'valid-token-123' },
      global: _globalConfig,
    })
    const inputs = wrapper.findAll('input[type="password"]')
    await inputs[0].setValue('newpass123')
    await inputs[1].setValue('different456')
    await flushPromises()
    expect(wrapper.text()).toContain('auth.passwordMismatch')
  })

  it('提交成功后显示成功提示', async () => {
    setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
    const { default: ResetPasswordForm } = await import('../../../components/auth/resetPasswordForm.vue')
    const wrapper = mount(ResetPasswordForm, {
      props: { token: 'valid-token-123' },
      global: _globalConfig,
    })
    const inputs = wrapper.findAll('input[type="password"]')
    await inputs[0].setValue('newpass123')
    await inputs[1].setValue('newpass123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('auth.passwordResetSuccess')
  })

  it('提交按钮在密码不匹配时 disabled', async () => {
    const { default: ResetPasswordForm } = await import('../../../components/auth/resetPasswordForm.vue')
    const wrapper = mount(ResetPasswordForm, {
      props: { token: 'valid-token-123' },
      global: _globalConfig,
    })
    const inputs = wrapper.findAll('input[type="password"]')
    await inputs[0].setValue('newpass123')
    await inputs[1].setValue('mismatch789')
    await flushPromises()
    const submitBtn = wrapper.find('button.ubtn')
    expect(submitBtn.attributes('disabled')).toBeDefined()
  })
})
