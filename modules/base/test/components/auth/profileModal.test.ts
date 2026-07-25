/**
 * auth/profileModal.vue 组件测试
 * @see modules/base/components/auth/profileModal.vue
 *
 * profileModal 通过 useProfileModal 管理状态，内部渲染 AuthUserProfileForm。
 */
import {
  describe, it, expect, beforeEach,
  mount, flushPromises,
  _globalStubs, _globalConfig, baseBeforeEach,
  setMockAuthUser,
} from './_shared'

beforeEach(() => {
  baseBeforeEach()
})

const _stubs = {
  ..._globalStubs,
  // AuthUserProfileForm 作为子组件 stub 为透传容器
  AuthUserProfileForm: {
    template: '<div class="stub-user-profile-form"><slot /></div>',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
}

describe('auth/profileModal.vue', () => {
  it('open=true 时渲染弹窗及标题', async () => {
    const { default: ProfileModal } = await import('../../../components/auth/profileModal.vue')
    const wrapper = mount(ProfileModal, {
      props: { open: true },
      global: { ..._globalConfig, stubs: _stubs },
    })
    expect(wrapper.text()).toContain('profile.title')
    expect(wrapper.find('.modal').exists()).toBe(true)
  })

  it('open=false 时不渲染弹窗内容', async () => {
    const { default: ProfileModal } = await import('../../../components/auth/profileModal.vue')
    const wrapper = mount(ProfileModal, {
      props: { open: false },
      global: { ..._globalConfig, stubs: _stubs },
    })
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('渲染 AuthUserProfileForm 子组件', async () => {
    const { default: ProfileModal } = await import('../../../components/auth/profileModal.vue')
    const wrapper = mount(ProfileModal, {
      props: { open: true },
      global: { ..._globalConfig, stubs: _stubs },
    })
    expect(wrapper.find('.stub-user-profile-form').exists()).toBe(true)
  })

  it('渲染取消和保存按钮', async () => {
    const { default: ProfileModal } = await import('../../../components/auth/profileModal.vue')
    const wrapper = mount(ProfileModal, {
      props: { open: true },
      global: { ..._globalConfig, stubs: _stubs },
    })
    const buttons = wrapper.findAll('button.ubtn')
    expect(buttons.some(b => b.text().includes('common.cancel'))).toBe(true)
    expect(buttons.some(b => b.text().includes('common.save'))).toBe(true)
  })

  it('open 从 false→true 且有用户时加载表单数据', async () => {
    setMockAuthUser(
      { id: 1, username: 'alice', name: 'Alice', email: 'alice@test.com' },
      [{ code: 'student', name: 'Student' }],
    )
    const { default: ProfileModal } = await import('../../../components/auth/profileModal.vue')
    const wrapper = mount(ProfileModal, {
      props: { open: false },
      global: { ..._globalConfig, stubs: _stubs },
    })
    // 切换 open 为 true，触发 watch 加载用户数据
    await wrapper.setProps({ open: true })
    await flushPromises()
    // AuthUserProfileForm 的 modelValue 应包含用户名
    const stub = wrapper.findComponent({ name: 'AuthUserProfileForm' })
    if (stub.exists()) {
      const modelValue = stub.props('modelValue')
      expect(modelValue.name).toBe('Alice')
      expect(modelValue.email).toBe('alice@test.com')
    }
  })
})
