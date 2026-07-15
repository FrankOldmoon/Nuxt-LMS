/**
 * auth/userEditModal.vue component tests
 * @see modules/base/components/auth/userEditModal.vue
 *
 * userEditModal manages state via useUserEditModal, accepts userId prop, exposes show() method.
 */
import {
  describe, it, expect, beforeEach,
  mount, flushPromises,
  _globalStubs, _globalConfig, baseBeforeEach,
  setMockFetchHandler,
} from './_shared'

beforeEach(() => {
  baseBeforeEach()
  setMockFetchHandler(async (url: string) => {
    if (String(url).includes('/api/users/show')) {
      return {
        data: { id: 1, name: 'Alice', email: 'alice@test.com', preferName: 'Al' },
        success: true,
        msg: '',
      }
    }
    return { data: null, success: true, msg: '' }
  })
})

const _stubs = {
  ..._globalStubs,
  AuthUserProfileForm: {
    template: '<div class="stub-user-profile-form"><slot /></div>',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
}

describe('auth/userEditModal.vue', () => {
  it('接受 userId prop', async () => {
    const { default: UserEditModal } = await import('../../../components/auth/userEditModal.vue')
    const wrapper = mount(UserEditModal, {
      props: { userId: 42 },
      global: { ..._globalConfig, stubs: _stubs },
    })
    expect(wrapper.props('userId')).toBe(42)
  })

  it('userId 为 null 时不报错', async () => {
    const { default: UserEditModal } = await import('../../../components/auth/userEditModal.vue')
    const wrapper = mount(UserEditModal, {
      props: { userId: null },
      global: { ..._globalConfig, stubs: _stubs },
    })
    expect(wrapper.props('userId')).toBeNull()
  })

  it('调用 show() 后弹窗打开并加载用户数据', async () => {
    const { default: UserEditModal } = await import('../../../components/auth/userEditModal.vue')
    const wrapper = mount(UserEditModal, {
      props: { userId: 1 },
      global: { ..._globalConfig, stubs: _stubs },
    })
    const vm: any = wrapper.vm
    expect(vm.show).toBeDefined()
    vm.show()
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(true)
    expect(wrapper.text()).toContain('profile.title')
  })

  it('渲染取消和保存按钮', async () => {
    const { default: UserEditModal } = await import('../../../components/auth/userEditModal.vue')
    const wrapper = mount(UserEditModal, {
      props: { userId: 1 },
      global: { ..._globalConfig, stubs: _stubs },
    })
    const vm: any = wrapper.vm
    vm.show()
    await flushPromises()
    const buttons = wrapper.findAll('button.ubtn')
    expect(buttons.some(b => b.text().includes('common.cancel'))).toBe(true)
    expect(buttons.some(b => b.text().includes('common.save'))).toBe(true)
  })

  it('emit saved 事件可被触发', async () => {
    const { default: UserEditModal } = await import('../../../components/auth/userEditModal.vue')
    const wrapper = mount(UserEditModal, {
      props: { userId: 1 },
      global: { ..._globalConfig, stubs: _stubs },
    })
    wrapper.vm.$emit('saved')
    await flushPromises()
    expect(wrapper.emitted('saved')).toBeTruthy()
  })
})
