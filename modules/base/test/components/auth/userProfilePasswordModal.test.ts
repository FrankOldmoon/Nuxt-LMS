/**
 * auth/userProfilePasswordModal.vue 组件测试
 * @see modules/base/components/auth/userProfilePasswordModal.vue
 */
import {
  describe, it, expect, beforeEach,
  mount, flushPromises,
  _globalConfig, baseBeforeEach,
  setMockFetchHandler, clearMockFetchHandler, getToastCalls,
} from './_shared'

beforeEach(() => {
  baseBeforeEach()
  clearMockFetchHandler()
})

describe('auth/userProfilePasswordModal.vue', () => {
  it('open=true 时渲染修改密码弹窗', async () => {
    const { default: UserProfilePasswordModal } = await import('../../../components/auth/userProfilePasswordModal.vue')
    const wrapper = mount(UserProfilePasswordModal, {
      props: { open: true },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('profile.changePassword')
    const inputs = wrapper.findAll('input[type="password"]')
    expect(inputs).toHaveLength(3)
  })

  it('open=false 时不渲染弹窗内容', async () => {
    const { default: UserProfilePasswordModal } = await import('../../../components/auth/userProfilePasswordModal.vue')
    const wrapper = mount(UserProfilePasswordModal, {
      props: { open: false },
      global: _globalConfig,
    })
    // UModal stub uses v-if="open"
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('两次新密码不一致时显示 mismatch 错误', async () => {
    const { default: UserProfilePasswordModal } = await import('../../../components/auth/userProfilePasswordModal.vue')
    const wrapper = mount(UserProfilePasswordModal, {
      props: { open: true },
      global: _globalConfig,
    })
    const inputs = wrapper.findAll('input[type="password"]')
    await inputs[1].setValue('newpass123')
    await inputs[2].setValue('different456')
    await flushPromises()
    expect(wrapper.text()).toContain('profile.passwordMismatch')
  })

  it('确认按钮在字段为空时 disabled', async () => {
    const { default: UserProfilePasswordModal } = await import('../../../components/auth/userProfilePasswordModal.vue')
    const wrapper = mount(UserProfilePasswordModal, {
      props: { open: true },
      global: _globalConfig,
    })
    const buttons = wrapper.findAll('button.ubtn')
    const confirmBtn = buttons.find(b => b.text().includes('common.confirm'))
    expect(confirmBtn).toBeTruthy()
    expect(confirmBtn!.attributes('disabled')).toBeDefined()
  })

  it('成功修改密码后关闭弹窗', async () => {
    setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
    const { default: UserProfilePasswordModal } = await import('../../../components/auth/userProfilePasswordModal.vue')
    const wrapper = mount(UserProfilePasswordModal, {
      props: { open: true },
      global: _globalConfig,
    })
    const inputs = wrapper.findAll('input[type="password"]')
    await inputs[0].setValue('oldpass123')
    await inputs[1].setValue('newpass123')
    await inputs[2].setValue('newpass123')
    await flushPromises()
    const buttons = wrapper.findAll('button.ubtn')
    const confirmBtn = buttons.find(b => b.text().includes('common.confirm'))
    await confirmBtn!.trigger('click')
    await flushPromises()
    // Modal should be closed (open prop updated to false via v-model)
    const emitted = wrapper.emitted('update:open')
    expect(emitted).toBeTruthy()
    expect(emitted![emitted!.length - 1]).toEqual([false])
  })
})
