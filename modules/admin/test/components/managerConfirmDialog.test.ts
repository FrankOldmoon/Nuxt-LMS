/**
 * managerConfirmDialog 组件测试
 * @see modules/admin/components/table/managerConfirmDialog.vue
 */
import { describe, it, expect, beforeEach, mount, baseBeforeEach, _globalConfig } from './_shared'

beforeEach(baseBeforeEach)

describe('table/managerConfirmDialog.vue', () => {
  it('mounts 并接受 props', async () => {
    const { default: ManagerConfirmDialog } = await import('../../components/table/managerConfirmDialog.vue')
    const wrapper = mount(ManagerConfirmDialog, {
      props: { open: false, text: '确认删除？', color: 'error', loading: false },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.props('text')).toBe('确认删除？')
    expect(wrapper.props('color')).toBe('error')
    expect(wrapper.props('loading')).toBe(false)
  })

  it('open=false 时不渲染 modal', async () => {
    const { default: ManagerConfirmDialog } = await import('../../components/table/managerConfirmDialog.vue')
    const wrapper = mount(ManagerConfirmDialog, {
      props: { open: false, text: 'x', color: 'error', loading: false },
      global: _globalConfig,
    })
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('open=true 时渲染 modal 并显示文案', async () => {
    const { default: ManagerConfirmDialog } = await import('../../components/table/managerConfirmDialog.vue')
    const wrapper = mount(ManagerConfirmDialog, {
      props: { open: true, text: '确认删除？', color: 'error', loading: false },
      global: _globalConfig,
    })
    expect(wrapper.find('.modal').exists()).toBe(true)
    expect(wrapper.text()).toContain('确认删除？')
  })

  it('渲染 cancel 和 save 按钮', async () => {
    const { default: ManagerConfirmDialog } = await import('../../components/table/managerConfirmDialog.vue')
    const wrapper = mount(ManagerConfirmDialog, {
      props: { open: true, text: 'x', color: 'error', loading: false },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('admin.form.cancel')
    expect(wrapper.text()).toContain('admin.form.save')
  })

  it('点击 cancel 按钮触发 cancel 事件', async () => {
    const { default: ManagerConfirmDialog } = await import('../../components/table/managerConfirmDialog.vue')
    const wrapper = mount(ManagerConfirmDialog, {
      props: { open: true, text: 'x', color: 'error', loading: false },
      global: _globalConfig,
    })
    const buttons = wrapper.findAll('button')
    // cancel = 第一个按钮
    await buttons[0].trigger('click')
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('点击 save 按钮触发 confirm 事件', async () => {
    const { default: ManagerConfirmDialog } = await import('../../components/table/managerConfirmDialog.vue')
    const wrapper = mount(ManagerConfirmDialog, {
      props: { open: true, text: 'x', color: 'error', loading: false },
      global: _globalConfig,
    })
    const buttons = wrapper.findAll('button')
    // confirm/save = 第二个按钮
    await buttons[1].trigger('click')
    expect(wrapper.emitted('confirm')).toBeTruthy()
  })

  it('接受不同 color prop', async () => {
    const { default: ManagerConfirmDialog } = await import('../../components/table/managerConfirmDialog.vue')
    const wrapper = mount(ManagerConfirmDialog, {
      props: { open: true, text: 'x', color: 'success', loading: true },
      global: _globalConfig,
    })
    expect(wrapper.props('color')).toBe('success')
    expect(wrapper.props('loading')).toBe(true)
  })
})
