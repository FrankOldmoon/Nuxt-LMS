/**
 * auth/settings/mailSection.vue component tests
 * @see modules/base/components/auth/settings/mailSection.vue
 */
import {
  describe, it, expect, beforeEach,
  mount,
  _globalConfig, baseBeforeEach,
} from '../_shared'

beforeEach(() => {
  baseBeforeEach()
})

function makeMailForm(overrides: any = {}) {
  return {
    mail: {
      host: 'smtp.example.com',
      port: 465,
      secure: true,
      user: 'noreply',
      pass: 'secret',
      from: 'noreply@example.com',
      siteUrl: 'https://example.com',
      ...overrides,
    },
  }
}

describe('auth/settings/mailSection.vue', () => {
  it('渲染 mail section 标题', async () => {
    const { default: MailSection } = await import('../../../../components/auth/settings/mailSection.vue')
    const wrapper = mount(MailSection, {
      props: { form: makeMailForm() },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('settings.mailSection')
  })

  it('渲染所有邮件配置字段', async () => {
    const { default: MailSection } = await import('../../../../components/auth/settings/mailSection.vue')
    const wrapper = mount(MailSection, {
      props: { form: makeMailForm() },
      global: _globalConfig,
    })
    const labels = wrapper.findAll('label')
    const labelTexts = labels.map(l => l.text())
    expect(labelTexts.some(t => t.includes('settings.mailHost'))).toBe(true)
    expect(labelTexts.some(t => t.includes('settings.mailPort'))).toBe(true)
    expect(labelTexts.some(t => t.includes('settings.mailSecure'))).toBe(true)
    expect(labelTexts.some(t => t.includes('settings.mailUser'))).toBe(true)
    expect(labelTexts.some(t => t.includes('settings.mailPass'))).toBe(true)
    expect(labelTexts.some(t => t.includes('settings.mailFrom'))).toBe(true)
    expect(labelTexts.some(t => t.includes('settings.siteUrl'))).toBe(true)
  })

  it('渲染密码字段为 password 类型', async () => {
    const { default: MailSection } = await import('../../../../components/auth/settings/mailSection.vue')
    const wrapper = mount(MailSection, {
      props: { form: makeMailForm() },
      global: _globalConfig,
    })
    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
  })

  it('渲染 USwitch 用于 secure', async () => {
    const { default: MailSection } = await import('../../../../components/auth/settings/mailSection.vue')
    const wrapper = mount(MailSection, {
      props: { form: makeMailForm({ mail: { secure: true } }) },
      global: _globalConfig,
    })
    expect(wrapper.find('input.uswitch').exists()).toBe(true)
  })
})
