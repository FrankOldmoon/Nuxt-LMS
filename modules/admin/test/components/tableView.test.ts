/**
 * TableView 组件测试
 * @see modules/admin/components/table/TableView.vue
 */
import { describe, it, expect, beforeEach, mount, baseBeforeEach, _globalStubs, _globalConfig, makeColumn } from './_shared'

beforeEach(baseBeforeEach)

const _stubs = {
  ..._globalStubs,
  TableRow: { template: '<tr class="table-row"><td v-for="c in visibleColumns" :key="c.jsName">{{ row[c.jsName] }}</td></tr>', props: ['row', 'visibleColumns', 'selectedKeys', 'canEdit', 'canDelete', 'includeDeleted', 'rowKeyOf', 'fkLabels'] },
}

const _config = { ..._globalConfig, stubs: _stubs }

describe('table/TableView.vue', () => {
  const columns = [
    makeColumn({ jsName: 'id', dataType: 'number' }),
    makeColumn({ jsName: 'name', dataType: 'string', isAutoIncrement: false, isPrimaryKey: false }),
  ]
  const rows = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ]
  const rowKeyOf = (r: any) => String(r.id)

  it('渲染表头列名', async () => {
    const { default: TableView } = await import('../../components/table/TableView.vue')
    const wrapper = mount(TableView, {
      props: {
        visibleColumns: columns, rows, selectedKeys: new Set(), allSelected: false,
        sort: null, includeDeleted: false, canEdit: true, canDelete: true,
        hasId: true, pending: false, rowKeyOf,
      },
      global: _config,
    })
    expect(wrapper.text()).toContain('id')
    expect(wrapper.text()).toContain('name')
  })

  it('渲染所有行', async () => {
    const { default: TableView } = await import('../../components/table/TableView.vue')
    const wrapper = mount(TableView, {
      props: {
        visibleColumns: columns, rows, selectedKeys: new Set(), allSelected: false,
        sort: null, includeDeleted: false, canEdit: false, canDelete: false,
        hasId: true, pending: false, rowKeyOf,
      },
      global: _config,
    })
    expect(wrapper.findAll('.table-row').length).toBe(2)
  })

  it('空行时渲染 noData 提示', async () => {
    const { default: TableView } = await import('../../components/table/TableView.vue')
    const wrapper = mount(TableView, {
      props: {
        visibleColumns: columns, rows: [], selectedKeys: new Set(), allSelected: false,
        sort: null, includeDeleted: false, canEdit: false, canDelete: false,
        hasId: true, pending: false, rowKeyOf,
      },
      global: _config,
    })
    expect(wrapper.text()).toContain('admin.table.noData')
  })

  it('pending=true 且空行时渲染加载提示', async () => {
    const { default: TableView } = await import('../../components/table/TableView.vue')
    const wrapper = mount(TableView, {
      props: {
        visibleColumns: columns, rows: [], selectedKeys: new Set(), allSelected: false,
        sort: null, includeDeleted: false, canEdit: false, canDelete: false,
        hasId: true, pending: true, rowKeyOf,
      },
      global: _config,
    })
    expect(wrapper.text()).toContain('...')
  })

  it('点击表头触发 sort 事件', async () => {
    const { default: TableView } = await import('../../components/table/TableView.vue')
    const wrapper = mount(TableView, {
      props: {
        visibleColumns: columns, rows, selectedKeys: new Set(), allSelected: false,
        sort: null, includeDeleted: false, canEdit: false, canDelete: false,
        hasId: true, pending: false, rowKeyOf,
      },
      global: _config,
    })
    const ths = wrapper.findAll('th')
    // 找到点击 "name" 列（第二列）
    await ths[1].trigger('click')
    expect(wrapper.emitted('sort')).toBeTruthy()
    expect(wrapper.emitted('sort')![0]).toEqual(['name'])
  })

  it('排序状态渲染对应箭头图标', async () => {
    const { default: TableView } = await import('../../components/table/TableView.vue')
    const wrapper = mount(TableView, {
      props: {
        visibleColumns: columns, rows, selectedKeys: new Set(), allSelected: false,
        sort: { column: 'name', dir: 'asc' }, includeDeleted: false,
        canEdit: false, canDelete: false, hasId: true, pending: false, rowKeyOf,
      },
      global: _config,
    })
    // UIcon 渲染为 span.uicon，验证存在即可
    expect(wrapper.findAll('.uicon').length).toBeGreaterThan(0)
  })

  it('canDelete=true 时渲染全选 checkbox 列', async () => {
    const { default: TableView } = await import('../../components/table/TableView.vue')
    const wrapper = mount(TableView, {
      props: {
        visibleColumns: columns, rows, selectedKeys: new Set(), allSelected: false,
        sort: null, includeDeleted: false, canEdit: false, canDelete: true,
        hasId: true, pending: false, rowKeyOf,
      },
      global: _config,
    })
    const checkbox = wrapper.find('input[type="checkbox"]')
    expect(checkbox.exists()).toBe(true)
  })

  it('点击全选 checkbox 触发 toggleSelectAll 事件', async () => {
    const { default: TableView } = await import('../../components/table/TableView.vue')
    const wrapper = mount(TableView, {
      props: {
        visibleColumns: columns, rows, selectedKeys: new Set(), allSelected: false,
        sort: null, includeDeleted: false, canEdit: false, canDelete: true,
        hasId: true, pending: false, rowKeyOf,
      },
      global: _config,
    })
    await wrapper.find('input[type="checkbox"]').trigger('change')
    expect(wrapper.emitted('toggleSelectAll')).toBeTruthy()
  })

  it('canEdit/canDelete 时渲染 actions 列', async () => {
    const { default: TableView } = await import('../../components/table/TableView.vue')
    const wrapper = mount(TableView, {
      props: {
        visibleColumns: columns, rows, selectedKeys: new Set(), allSelected: false,
        sort: null, includeDeleted: false, canEdit: true, canDelete: false,
        hasId: true, pending: false, rowKeyOf,
      },
      global: _config,
    })
    expect(wrapper.text()).toContain('admin.table.actions')
  })
})
