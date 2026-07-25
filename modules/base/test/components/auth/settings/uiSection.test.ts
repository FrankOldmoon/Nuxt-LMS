/**
 * auth/settings/uiSection.vue 组件测试
 * @see modules/base/components/auth/settings/uiSection.vue
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
    siteShowNotify: true,
    siteShowMsg: true,
    siteShowMyFiles: true,
    ...overrides,
  }
}

describe('auth/settings/uiSection.vue', () => {
  it('渲染 UI section 标题', async () => {
    const { default: UiSection } = await import('../../../../components/auth/settings/uiSection.vue')
    const wrapper = mount(UiSection, {
      props: { form: makeForm() },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('settings.uiSection')
  })

  it('渲染三个显示开关', async () => {
    const { default: UiSection } = await import('../../../../components/auth/settings/uiSection.vue')
    const wrapper = mount(UiSection, {
      props: { form: makeForm() },
      global: _globalConfig,
    })
    const switches = wrapper.findAll('input.uswitch')
    expect(switches).toHaveLength(3)
    const labels = wrapper.findAll('label')
    const labelTexts = labels.map(l => l.text())
    expect(labelTexts.some(t => t.includes('settings.showNotify'))).toBe(true)
    expect(labelTexts.some(t => t.includes('settings.showMsg'))).toBe(true)
    expect(labelTexts.some(t => t.includes('settings.showMyFiles'))).toBe(true)
  })

  it('接受 form prop', async () => {
    const { default: UiSection } = await import('../../../../components/auth/settings/uiSection.vue')
    const wrapper = mount(UiSection, {
      props: { form: makeForm({ siteShowNotify: false }) },
      global: _globalConfig,
    })
    expect(wrapper.props('form').siteShowNotify).toBe(false)
  })
})
