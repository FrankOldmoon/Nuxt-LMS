/**
 * auth/settings/generalSection.vue component tests
 * @see modules/base/components/auth/settings/generalSection.vue
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
    siteTitle: 'My Site',
    siteDescription: 'A description',
    siteKeywords: 'edu, lms',
    siteLogo: '/logo.png',
    siteFavicon: '/favicon.ico',
    siteFooterText: 'Copyright',
    siteDefaultLocale: 'en',
    siteTimezone: 'UTC',
    sitePageSize: 20,
    siteMaxFileSize: 50,
    siteAllowedFileTypes: 'pdf,doc',
    siteMaintenanceMode: false,
    ...overrides,
  }
}

describe('auth/settings/generalSection.vue', () => {
  it('渲染 section 标题', async () => {
    const { default: GeneralSection } = await import('../../../../components/auth/settings/generalSection.vue')
    const wrapper = mount(GeneralSection, {
      props: { form: makeForm() },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('settings.generalSection')
  })

  it('渲染所有表单字段', async () => {
    const { default: GeneralSection } = await import('../../../../components/auth/settings/generalSection.vue')
    const wrapper = mount(GeneralSection, {
      props: { form: makeForm() },
      global: _globalConfig,
    })
    const labels = wrapper.findAll('label')
    const labelTexts = labels.map(l => l.text())
    expect(labelTexts.some(t => t.includes('settings.siteTitle'))).toBe(true)
    expect(labelTexts.some(t => t.includes('settings.siteDescription'))).toBe(true)
    expect(labelTexts.some(t => t.includes('settings.siteLogo'))).toBe(true)
    expect(labelTexts.some(t => t.includes('settings.pageSize'))).toBe(true)
    expect(labelTexts.some(t => t.includes('settings.maintenanceMode'))).toBe(true)
  })

  it('接受 form prop 并渲染 textarea 用于 siteDescription', async () => {
    const { default: GeneralSection } = await import('../../../../components/auth/settings/generalSection.vue')
    const wrapper = mount(GeneralSection, {
      props: { form: makeForm({ siteDescription: 'Custom description' }) },
      global: _globalConfig,
    })
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('渲染 USwitch 用于 maintenanceMode', async () => {
    const { default: GeneralSection } = await import('../../../../components/auth/settings/generalSection.vue')
    const wrapper = mount(GeneralSection, {
      props: { form: makeForm({ siteMaintenanceMode: true }) },
      global: _globalConfig,
    })
    expect(wrapper.find('input.uswitch').exists()).toBe(true)
  })
})
