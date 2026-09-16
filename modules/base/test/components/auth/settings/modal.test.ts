/**
 * auth/settings/modal.vue 组件测试
 * @see modules/base/components/auth/settings/modal.vue
 *
 * settings/modal 通过 useSettingsForm 管理状态，多 Tab 切换，同一时刻只渲染激活 Tab 的 section。
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

  it('按 Tab 渲染对应 section 子组件（同时只渲染激活的那个）', async () => {
    const { default: SettingsModal } = await import('../../../../components/auth/settings/modal.vue')
    const wrapper = mount(SettingsModal, {
      props: { open: true },
      global: { ..._globalConfig, stubs: _stubs },
    })
    await flushPromises()

    // 默认激活 general，其余 Tab 的 section 不渲染
    expect(wrapper.find('.stub-general-section').exists()).toBe(true)
    expect(wrapper.find('.stub-security-section').exists()).toBe(false)
    expect(wrapper.find('.stub-mail-section').exists()).toBe(false)

    const clickTab = async (label: string, selector: string) => {
      const tab = wrapper.findAll('.utab').find(t => t.text() === label)
      expect(tab, `未找到 Tab: ${label}`).toBeTruthy()
      await tab!.trigger('click')
      expect(wrapper.find(selector).exists()).toBe(true)
    }

    await clickTab('settings.generalSection', '.stub-general-section')
    await clickTab('settings.securitySection', '.stub-security-section')
    await clickTab('settings.storageSection', '.stub-storage-section')
    await clickTab('settings.uiSection', '.stub-ui-section')
    await clickTab('settings.mailSection', '.stub-mail-section')
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
