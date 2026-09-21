/**
 * auth/settings/securitySection.vue 组件测试
 * @see modules/base/components/auth/settings/securitySection.vue
 */
import {
  describe, it, expect, beforeEach,
  mount,
  _globalConfig, baseBeforeEach,
} from '../_shared'

beforeEach(() => {
  baseBeforeEach()
})

function makeForm(overrides: any = {}) {
  return {
    siteAllowRegistration: false,
    siteAllowForgotPassword: true,
    siteDefaultUserRole: 'student',
    sitePasswordMinLength: 6,
    siteSessionMaxAge: 604800,
    ...overrides,
  }
}

describe('auth/settings/securitySection.vue', () => {
  it('渲染 security section 标题', async () => {
    const { default: SecuritySection } = await import('../../../../components/auth/settings/securitySection.vue')
    const wrapper = mount(SecuritySection, {
      props: { form: makeForm() },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('settings.securitySection')
  })

  it('渲染注册和忘记密码开关', async () => {
    const { default: SecuritySection } = await import('../../../../components/auth/settings/securitySection.vue')
    const wrapper = mount(SecuritySection, {
      props: { form: makeForm() },
      global: _globalConfig,
    })
    const switches = wrapper.findAll('input.uswitch')
    expect(switches).toHaveLength(2)
    const labels = wrapper.findAll('label')
    const labelTexts = labels.map(l => l.text())
    expect(labelTexts.some(t => t.includes('settings.allowRegistration'))).toBe(true)
    expect(labelTexts.some(t => t.includes('settings.allowForgotPassword'))).toBe(true)
  })

  it('渲染密码最小长度和默认角色字段', async () => {
    const { default: SecuritySection } = await import('../../../../components/auth/settings/securitySection.vue')
    const wrapper = mount(SecuritySection, {
      props: { form: makeForm() },
      global: _globalConfig,
    })
    const labels = wrapper.findAll('label')
    const labelTexts = labels.map(l => l.text())
    expect(labelTexts.some(t => t.includes('settings.defaultUserRole'))).toBe(true)
    expect(labelTexts.some(t => t.includes('settings.passwordMinLength'))).toBe(true)
  })

  it('渲染会话字段', async () => {
    const { default: SecuritySection } = await import('../../../../components/auth/settings/securitySection.vue')
    const wrapper = mount(SecuritySection, {
      props: { form: makeForm() },
      global: _globalConfig,
    })
    const labels = wrapper.findAll('label')
    const labelTexts = labels.map(l => l.text())
    expect(labelTexts.some(t => t.includes('settings.sessionMaxAge'))).toBe(true)
  })
})
