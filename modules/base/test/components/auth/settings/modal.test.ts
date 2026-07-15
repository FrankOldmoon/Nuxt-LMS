/**
 * auth/settings/modal.vue component tests
 * @see modules/base/components/auth/settings/modal.vue
 *
 * settings/modal manages state via useSettingsForm, internally renders 5 section child components.
 */
import {
  describe, it, expect, beforeEach,
  mount, flushPromises,
  _globalStubs, _globalConfig, baseBeforeEach,
  setMockFetchHandler,
} from '../_shared'

beforeEach(() => {
  baseBeforeEach()
  // useSettingsForm watch isOpen → loadSettings → cRequest('/api/config/list')
  setMockFetchHandler(async (url: string) => {
    if (String(url).includes('/api/config/list')) {
      return { data: [], success: true, msg: '' }
    }
    return { data: null, success: true, msg: '' }
  })
})

const _stubs = {
  ..._globalStubs,
  AuthSettingsGeneralSection: {
    template: '<div class="stub-general-section" />',
    props: ['form'],
  },
  AuthSettingsSecuritySection: {
    template: '<div class="stub-security-section" />',
    props: ['form'],
  },
  AuthSettingsStorageSection: {
    template: '<div class="stub-storage-section" />',
    props: ['form'],
  },
  AuthSettingsUiSection: {
    template: '<div class="stub-ui-section" />',
    props: ['form'],
  },
  AuthSettingsMailSection: {
    template: '<div class="stub-mail-section" />',
    props: ['form'],
  },
}

describe('auth/settings/modal.vue', () => {
  it('open=true 时渲染弹窗及标题', async () => {
    const { default: SettingsModal } = await import('../../../../components/auth/settings/modal.vue')
    const wrapper = mount(SettingsModal, {
      props: { open: true },
      global: { ..._globalConfig, stubs: _stubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('settings.title')
    expect(wrapper.find('.modal').exists()).toBe(true)
  })

  it('open=false 时不渲染弹窗内容', async () => {
    const { default: SettingsModal } = await import('../../../../components/auth/settings/modal.vue')
    const wrapper = mount(SettingsModal, {
      props: { open: false },
      global: { ..._globalConfig, stubs: _stubs },
    })
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('渲染所有 5 个 section 子组件', async () => {
    const { default: SettingsModal } = await import('../../../../components/auth/settings/modal.vue')
    const wrapper = mount(SettingsModal, {
      props: { open: true },
      global: { ..._globalConfig, stubs: _stubs },
    })
    await flushPromises()
    expect(wrapper.find('.stub-general-section').exists()).toBe(true)
    expect(wrapper.find('.stub-security-section').exists()).toBe(true)
    expect(wrapper.find('.stub-storage-section').exists()).toBe(true)
    expect(wrapper.find('.stub-ui-section').exists()).toBe(true)
    expect(wrapper.find('.stub-mail-section').exists()).toBe(true)
  })

  it('渲染取消和保存按钮', async () => {
    const { default: SettingsModal } = await import('../../../../components/auth/settings/modal.vue')
    const wrapper = mount(SettingsModal, {
      props: { open: true },
      global: { ..._globalConfig, stubs: _stubs },
    })
    await flushPromises()
    const buttons = wrapper.findAll('button.ubtn')
    expect(buttons.some(b => b.text().includes('common.cancel'))).toBe(true)
    expect(buttons.some(b => b.text().includes('common.save'))).toBe(true)
  })
})
