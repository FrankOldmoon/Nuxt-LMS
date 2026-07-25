/**
 * managerBatchBar 组件测试
 * @see modules/admin/components/table/managerBatchBar.vue
 */
import { describe, it, expect, beforeEach, mount, baseBeforeEach, _globalConfig } from './_shared'

beforeEach(baseBeforeEach)

describe('table/managerBatchBar.vue', () => {
  it('selectedRows 为空时不渲染', async () => {
    const { default: ManagerBatchBar } = await import('../../components/table/managerBatchBar.vue')
    const wrapper = mount(ManagerBatchBar, {
      props: { selectedRows: [], includeDeleted: false },
      global: _globalConfig,
    })
    // 整个根 div 有 v-if，不存在
    expect(wrapper.find('div').exists()).toBe(false)
  })

  it('selectedRows 有值时渲染', async () => {
    const { default: ManagerBatchBar } = await import('../../components/table/managerBatchBar.vue')
    const wrapper = mount(ManagerBatchBar, {
      props: { selectedRows: [{ id: 1 }], includeDeleted: false },
      global: _globalConfig,
    })
    expect(wrapper.find('div').exists()).toBe(true)
  })

  it('显示选中行数', async () => {
    const { default: ManagerBatchBar } = await import('../../components/table/managerBatchBar.vue')
    const wrapper = mount(ManagerBatchBar, {
      props: { selectedRows: [{ id: 1 }, { id: 2 }, { id: 3 }], includeDeleted: false },
      global: _globalConfig,
    })
    // admin.table.selected {count:3} → mock 不解析参数，只显示 key
    expect(wrapper.text()).toContain('admin.table.selected')
  })

  it('includeDeleted=false 时渲染 delete 按钮', async () => {
    const { default: ManagerBatchBar } = await import('../../components/table/managerBatchBar.vue')
    const wrapper = mount(ManagerBatchBar, {
      props: { selectedRows: [{ id: 1 }], includeDeleted: false },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('admin.table.delete')
    expect(wrapper.text()).not.toContain('admin.table.restore')
    expect(wrapper.text()).not.toContain('admin.table.remove')
  })

  it('includeDeleted=true 时渲染 restore + remove 按钮', async () => {
    const { default: ManagerBatchBar } = await import('../../components/table/managerBatchBar.vue')
    const wrapper = mount(ManagerBatchBar, {
      props: { selectedRows: [{ id: 1 }], includeDeleted: true },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('admin.table.restore')
    expect(wrapper.text()).toContain('admin.table.remove')
    expect(wrapper.text()).not.toContain('admin.table.delete')
  })

  it('点击 delete 按钮触发 batch 事件 (action=delete)', async () => {
    const { default: ManagerBatchBar } = await import('../../components/table/managerBatchBar.vue')
    const wrapper = mount(ManagerBatchBar, {
      props: { selectedRows: [{ id: 1 }], includeDeleted: false },
      global: _globalConfig,
    })
    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    expect(wrapper.emitted('batch')).toBeTruthy()
    expect(wrapper.emitted('batch')![0]).toEqual(['delete'])
  })

  it('点击 restore 按钮触发 batch 事件 (action=restore)', async () => {
    const { default: ManagerBatchBar } = await import('../../components/table/managerBatchBar.vue')
    const wrapper = mount(ManagerBatchBar, {
      props: { selectedRows: [{ id: 1 }], includeDeleted: true },
      global: _globalConfig,
    })
    const buttons = wrapper.findAll('button')
    // restore=0, remove=1
    await buttons[0].trigger('click')
    expect(wrapper.emitted('batch')![0]).toEqual(['restore'])
  })

  it('点击 remove 按钮触发 batch 事件 (action=remove)', async () => {
    const { default: ManagerBatchBar } = await import('../../components/table/managerBatchBar.vue')
    const wrapper = mount(ManagerBatchBar, {
      props: { selectedRows: [{ id: 1 }], includeDeleted: true },
      global: _globalConfig,
    })
    const buttons = wrapper.findAll('button')
    await buttons[1].trigger('click')
    expect(wrapper.emitted('batch')![0]).toEqual(['remove'])
  })
})
