/**
 * managerToolbar 组件测试
 * @see modules/admin/components/table/managerToolbar.vue
 */
import { describe, it, expect, beforeEach, mount, baseBeforeEach, _globalStubs, _globalConfig, makeColumn } from './_shared'

beforeEach(baseBeforeEach)

const _stubs = {
  ..._globalStubs,
  TableColumnToggle: { template: '<div class="col-toggle" />', props: ['columns', 'hidden'] },
}

const _config = { ..._globalConfig, stubs: _stubs }

describe('table/managerToolbar.vue', () => {
  const columns = [
    makeColumn({ jsName: 'id', dataType: 'number' }),
    makeColumn({ jsName: 'name', dataType: 'string', isAutoIncrement: false, isPrimaryKey: false }),
  ]

  it('mounts 并接受 props', async () => {
    const { default: ManagerToolbar } = await import('../../components/table/managerToolbar.vue')
    const wrapper = mount(ManagerToolbar, {
      props: {
        canEdit: true, exporting: false, includeDeleted: false,
        total: 10, columns, hiddenColumns: new Set(),
      },
      global: _config,
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.props('canEdit')).toBe(true)
    expect(wrapper.props('total')).toBe(10)
  })

  it('canEdit=true 时渲染 add 按钮', async () => {
    const { default: ManagerToolbar } = await import('../../components/table/managerToolbar.vue')
    const wrapper = mount(ManagerToolbar, {
      props: {
        canEdit: true, exporting: false, includeDeleted: false,
        total: 0, columns, hiddenColumns: new Set(),
      },
      global: _config,
    })
    expect(wrapper.text()).toContain('admin.table.add')
  })

  it('canEdit=false 时不渲染 add 按钮', async () => {
    const { default: ManagerToolbar } = await import('../../components/table/managerToolbar.vue')
    const wrapper = mount(ManagerToolbar, {
      props: {
        canEdit: false, exporting: false, includeDeleted: false,
        total: 0, columns, hiddenColumns: new Set(),
      },
      global: _config,
    })
    expect(wrapper.text()).not.toContain('admin.table.add')
  })

  it('渲染 import 和 export 按钮', async () => {
    const { default: ManagerToolbar } = await import('../../components/table/managerToolbar.vue')
    const wrapper = mount(ManagerToolbar, {
      props: {
        canEdit: false, exporting: false, includeDeleted: false,
        total: 0, columns, hiddenColumns: new Set(),
      },
      global: _config,
    })
    expect(wrapper.text()).toContain('admin.table.import')
    expect(wrapper.text()).toContain('admin.table.export')
  })

  it('显示 total 数量', async () => {
    const { default: ManagerToolbar } = await import('../../components/table/managerToolbar.vue')
    const wrapper = mount(ManagerToolbar, {
      props: {
        canEdit: false, exporting: false, includeDeleted: false,
        total: 42, columns, hiddenColumns: new Set(),
      },
      global: _config,
    })
    expect(wrapper.text()).toContain('admin.table.total')
  })

  it('渲染 TableColumnToggle 子组件', async () => {
    const { default: ManagerToolbar } = await import('../../components/table/managerToolbar.vue')
    const wrapper = mount(ManagerToolbar, {
      props: {
        canEdit: false, exporting: false, includeDeleted: false,
        total: 0, columns, hiddenColumns: new Set(),
      },
      global: _config,
    })
    expect(wrapper.find('.col-toggle').exists()).toBe(true)
  })

  it('includeDeleted=false 时显示 trash 按钮', async () => {
    const { default: ManagerToolbar } = await import('../../components/table/managerToolbar.vue')
    const wrapper = mount(ManagerToolbar, {
      props: {
        canEdit: false, exporting: false, includeDeleted: false,
        total: 0, columns, hiddenColumns: new Set(),
      },
      global: _config,
    })
    expect(wrapper.text()).toContain('admin.table.trash')
  })

  it('includeDeleted=true 时显示 normal 按钮', async () => {
    const { default: ManagerToolbar } = await import('../../components/table/managerToolbar.vue')
    const wrapper = mount(ManagerToolbar, {
      props: {
        canEdit: false, exporting: false, includeDeleted: true,
        total: 0, columns, hiddenColumns: new Set(),
      },
      global: _config,
    })
    expect(wrapper.text()).toContain('admin.table.normal')
  })

  it('点击 add 按钮触发 add 事件', async () => {
    const { default: ManagerToolbar } = await import('../../components/table/managerToolbar.vue')
    const wrapper = mount(ManagerToolbar, {
      props: {
        canEdit: true, exporting: false, includeDeleted: false,
        total: 0, columns, hiddenColumns: new Set(),
      },
      global: _config,
    })
    const buttons = wrapper.findAll('button')
    // add=0, import=1, export=2, col-toggle(doesn't render button), trash=3
    await buttons[0].trigger('click')
    expect(wrapper.emitted('add')).toBeTruthy()
  })

  it('点击 import 按钮触发 import 事件', async () => {
    const { default: ManagerToolbar } = await import('../../components/table/managerToolbar.vue')
    const wrapper = mount(ManagerToolbar, {
      props: {
        canEdit: false, exporting: false, includeDeleted: false,
        total: 0, columns, hiddenColumns: new Set(),
      },
      global: _config,
    })
    const buttons = wrapper.findAll('button')
    // import=0 (canEdit=false, no add button), export=1, trash=2
    await buttons[0].trigger('click')
    expect(wrapper.emitted('import')).toBeTruthy()
  })

  it('点击 export 按钮触发 export 事件', async () => {
    const { default: ManagerToolbar } = await import('../../components/table/managerToolbar.vue')
    const wrapper = mount(ManagerToolbar, {
      props: {
        canEdit: false, exporting: false, includeDeleted: false,
        total: 0, columns, hiddenColumns: new Set(),
      },
      global: _config,
    })
    const buttons = wrapper.findAll('button')
    await buttons[1].trigger('click')
    expect(wrapper.emitted('export')).toBeTruthy()
  })

  it('点击 trash 按钮触发 toggle-trash 事件', async () => {
    const { default: ManagerToolbar } = await import('../../components/table/managerToolbar.vue')
    const wrapper = mount(ManagerToolbar, {
      props: {
        canEdit: false, exporting: false, includeDeleted: false,
        total: 0, columns, hiddenColumns: new Set(),
      },
      global: _config,
    })
    const buttons = wrapper.findAll('button')
    // import=0, export=1, trash=2
    await buttons[2].trigger('click')
    expect(wrapper.emitted('toggle-trash')).toBeTruthy()
  })
})
