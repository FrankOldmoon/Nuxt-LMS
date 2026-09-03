/**
 * UserCard 组件测试
 * @see modules/base/components/auth/userCard.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

const _globalStubs = {
  UAvatar: {
    template: '<div class="avatar"><slot /></div>',
    props: ['src', 'alt', 'text', 'size'],
  },
}

describe('auth/userCard.vue', () => {
  it('渲染用户 name', async () => {
    const { default: UserCard } = await import('../../components/auth/userCard.vue')
    const wrapper = mount(UserCard, {
      props: { user: { id: 1, name: 'Alice' } },
      global: { stubs: _globalStubs },
    })
    expect(wrapper.text()).toContain('Alice')
  })

  it('优先显示 name 而非 preferName', async () => {
    const { default: UserCard } = await import('../../components/auth/userCard.vue')
    const wrapper = mount(UserCard, {
      props: { user: { id: 1, name: 'Alice', preferName: '小爱' } },
      global: { stubs: _globalStubs },
    })
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).not.toContain('小爱')
  })

  it('name 缺失时回退到 preferName', async () => {
    const { default: UserCard } = await import('../../components/auth/userCard.vue')
    const wrapper = mount(UserCard, {
      props: { user: { id: 1, name: null as any, preferName: '小爱' } },
      global: { stubs: _globalStubs },
    })
    expect(wrapper.text()).toContain('小爱')
  })

  it('selected=true 时应用 primary 样式', async () => {
    const { default: UserCard } = await import('../../components/auth/userCard.vue')
    const wrapper = mount(UserCard, {
      props: { user: { id: 1, name: 'Alice' }, selected: true },
      global: { stubs: _globalStubs },
    })
    expect(wrapper.classes().join(' ')).toContain('border-primary')
  })

  it('selected=false 时应用 muted 样式', async () => {
    const { default: UserCard } = await import('../../components/auth/userCard.vue')
    const wrapper = mount(UserCard, {
      props: { user: { id: 1, name: 'Alice' }, selected: false },
      global: { stubs: _globalStubs },
    })
    expect(wrapper.classes().join(' ')).toContain('border-default')
  })

  it('点击时 emit click 事件', async () => {
    const { default: UserCard } = await import('../../components/auth/userCard.vue')
    const wrapper = mount(UserCard, {
      props: { user: { id: 1, name: 'Alice' } },
      global: { stubs: _globalStubs },
    })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })

  it('显示 username 而非 rollNumber', async () => {
    const { default: UserCard } = await import('../../components/auth/userCard.vue')
    const wrapper = mount(UserCard, {
      props: { user: { id: 1, name: 'Alice', username: '001', rollNumber: '99' } },
      global: { stubs: _globalStubs },
    })
    expect(wrapper.text()).toContain('001')
    expect(wrapper.text()).not.toContain('99')
  })

  it('size=lg 应用大尺寸 class', async () => {
    const { default: UserCard } = await import('../../components/auth/userCard.vue')
    const wrapper = mount(UserCard, {
      props: { user: { id: 1, name: 'Alice' }, size: 'lg' },
      global: { stubs: _globalStubs },
    })
    expect(wrapper.classes().join(' ')).toContain('w-36')
  })
})
