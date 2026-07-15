/**
 * tableRow component tests
 * @see modules/admin/components/table/tableRow.vue
 */
import { describe, it, expect, beforeEach, mount, baseBeforeEach, _globalStubs, _globalConfig, makeColumn } from './_shared'

beforeEach(baseBeforeEach)

const _stubs = {
  ..._globalStubs,
  TableCellView: { template: '<span class="cell-view">{{ value }}</span>', props: ['column', 'value', 'fkLabel'] },
}

const _config = { ..._globalConfig, stubs: _stubs }

describe('table/tableRow.vue', () => {
  const columns = [
    makeColumn({ jsName: 'id', dataType: 'number' }),
    makeColumn({ jsName: 'name', dataType: 'string', isAutoIncrement: false, isPrimaryKey: false }),
  ]
  const row = { id: 1, name: 'Alice' }
  const rowKeyOf = (r: any) => String(r.id)

  it('渲染行包含每列的 TableCellView', async () => {
    const { default: TableRow } = await import('../../components/table/tableRow.vue')
    const wrapper = mount(TableRow, {
      props: {
        row, visibleColumns: columns, selectedKeys: new Set(),
        canEdit: false, canDelete: false, includeDeleted: false, rowKeyOf,
      },
      global: _config,
    })
    const cells = wrapper.findAll('.cell-view')
    expect(cells.length).toBe(2)
    expect(cells[0].text()).toBe('1')
    expect(cells[1].text()).toBe('Alice')
  })

  it('canDelete=true 时渲染 checkbox 列', async () => {
    const { default: TableRow } = await import('../../components/table/tableRow.vue')
    const wrapper = mount(TableRow, {
      props: {
        row, visibleColumns: columns, selectedKeys: new Set(),
        canEdit: false, canDelete: true, includeDeleted: false, rowKeyOf,
      },
      global: _config,
    })
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true)
  })

  it('canDelete=false 时不渲染 checkbox 列', async () => {
    const { default: TableRow } = await import('../../components/table/tableRow.vue')
    const wrapper = mount(TableRow, {
      props: {
        row, visibleColumns: columns, selectedKeys: new Set(),
        canEdit: false, canDelete: false, includeDeleted: false, rowKeyOf,
      },
      global: _config,
    })
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false)
  })

  it('点击 checkbox 触发 toggleSelect 事件', async () => {
    const { default: TableRow } = await import('../../components/table/tableRow.vue')
    const wrapper = mount(TableRow, {
      props: {
        row, visibleColumns: columns, selectedKeys: new Set(),
        canEdit: false, canDelete: true, includeDeleted: false, rowKeyOf,
      },
      global: _config,
    })
    await wrapper.find('input[type="checkbox"]').trigger('change')
    expect(wrapper.emitted('toggleSelect')).toBeTruthy()
    expect(wrapper.emitted('toggleSelect')![0]).toEqual(['1'])
  })

  it('canEdit=true 时渲染 view + edit 按钮', async () => {
    const { default: TableRow } = await import('../../components/table/tableRow.vue')
    const wrapper = mount(TableRow, {
      props: {
        row, visibleColumns: columns, selectedKeys: new Set(),
        canEdit: true, canDelete: false, includeDeleted: false, rowKeyOf,
      },
      global: _config,
    })
    const buttons = wrapper.findAll('button')
    // view + edit
    expect(buttons.length).toBe(2)
  })

  it('点击 view 按钮触发 view 事件', async () => {
    const { default: TableRow } = await import('../../components/table/tableRow.vue')
    const wrapper = mount(TableRow, {
      props: {
        row, visibleColumns: columns, selectedKeys: new Set(),
        canEdit: false, canDelete: true, includeDeleted: false, rowKeyOf,
      },
      global: _config,
    })
    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    expect(wrapper.emitted('view')).toBeTruthy()
    expect(wrapper.emitted('view')![0]).toEqual([row])
  })

  it('点击 edit 按钮触发 edit 事件', async () => {
    const { default: TableRow } = await import('../../components/table/tableRow.vue')
    const wrapper = mount(TableRow, {
      props: {
        row, visibleColumns: columns, selectedKeys: new Set(),
        canEdit: true, canDelete: false, includeDeleted: false, rowKeyOf,
      },
      global: _config,
    })
    const buttons = wrapper.findAll('button')
    // view=0, edit=1
    await buttons[1].trigger('click')
    expect(wrapper.emitted('edit')).toBeTruthy()
    expect(wrapper.emitted('edit')![0]).toEqual([row])
  })

  it('canDelete 且 !includeDeleted 时渲染 delete 按钮', async () => {
    const { default: TableRow } = await import('../../components/table/tableRow.vue')
    const wrapper = mount(TableRow, {
      props: {
        row, visibleColumns: columns, selectedKeys: new Set(),
        canEdit: false, canDelete: true, includeDeleted: false, rowKeyOf,
      },
      global: _config,
    })
    const buttons = wrapper.findAll('button')
    // view + delete
    expect(buttons.length).toBe(2)
    await buttons[1].trigger('click')
    expect(wrapper.emitted('delete')).toBeTruthy()
    expect(wrapper.emitted('delete')![0]).toEqual([row])
  })

  it('canDelete 且 includeDeleted 时渲染 restore + remove 按钮', async () => {
    const { default: TableRow } = await import('../../components/table/tableRow.vue')
    const wrapper = mount(TableRow, {
      props: {
        row, visibleColumns: columns, selectedKeys: new Set(),
        canEdit: false, canDelete: true, includeDeleted: true, rowKeyOf,
      },
      global: _config,
    })
    const buttons = wrapper.findAll('button')
    // view + restore + remove
    expect(buttons.length).toBe(3)
    await buttons[1].trigger('click')
    expect(wrapper.emitted('restore')).toBeTruthy()
    await buttons[2].trigger('click')
    expect(wrapper.emitted('remove')).toBeTruthy()
  })

  it('selectedKeys 包含当前行时 checkbox 选中', async () => {
    const { default: TableRow } = await import('../../components/table/tableRow.vue')
    const wrapper = mount(TableRow, {
      props: {
        row, visibleColumns: columns, selectedKeys: new Set(['1']),
        canEdit: false, canDelete: true, includeDeleted: false, rowKeyOf,
      },
      global: _config,
    })
    const checkbox = wrapper.find('input[type="checkbox"]') as any
    expect(checkbox.element.checked).toBe(true)
  })
})
