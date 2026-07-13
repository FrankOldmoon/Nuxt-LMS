/**
 * CShow 组件测试
 * @see modules/admin/components/table/CShow.vue
 */
import { describe, it, expect, beforeEach, mount, flushPromises, baseBeforeEach, _globalStubs, _globalConfig, makeColumn } from './_shared'

beforeEach(baseBeforeEach)

const _stubs = {
  ..._globalStubs,
  TableCellView: { template: '<span class="cell-view">{{ value }}</span>', props: ['column', 'value', 'fkLabel'] },
}

const _config = { ..._globalConfig, stubs: _stubs }

describe('table/CShow.vue', () => {
  const columns = [
    makeColumn({ jsName: 'id', dataType: 'number' }),
    makeColumn({ jsName: 'name', dataType: 'string', isAutoIncrement: false, isPrimaryKey: false }),
  ]
  const row = { id: 1, name: 'Alice' }

  it('mounts 并接受 props', async () => {
    const { default: CShow } = await import('../../components/table/CShow.vue')
    const wrapper = mount(CShow, {
      props: { tableName: 'users', columns, row, open: false },
      global: _config,
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.props('tableName')).toBe('users')
    expect(wrapper.props('row')).toStrictEqual(row)
  })

  it('open=false 时不渲染 modal', async () => {
    const { default: CShow } = await import('../../components/table/CShow.vue')
    const wrapper = mount(CShow, {
      props: { tableName: 'users', columns, row, open: false },
      global: _config,
    })
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('open=true 时渲染 modal', async () => {
    const { default: CShow } = await import('../../components/table/CShow.vue')
    const wrapper = mount(CShow, {
      props: { tableName: 'users', columns, row, open: true },
      global: _config,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(true)
  })

  it('渲染 recordDetail 标题', async () => {
    const { default: CShow } = await import('../../components/table/CShow.vue')
    const wrapper = mount(CShow, {
      props: { tableName: 'users', columns, row, open: true },
      global: _config,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('admin.table.recordDetail')
  })

  it('为每列渲染 TableCellView', async () => {
    const { default: CShow } = await import('../../components/table/CShow.vue')
    const wrapper = mount(CShow, {
      props: { tableName: 'users', columns, row, open: true },
      global: _config,
    })
    await flushPromises()
    const cells = wrapper.findAll('.cell-view')
    expect(cells.length).toBe(2)
    expect(cells[0].text()).toBe('1')
    expect(cells[1].text()).toBe('Alice')
  })

  it('显示每列的 jsName', async () => {
    const { default: CShow } = await import('../../components/table/CShow.vue')
    const wrapper = mount(CShow, {
      props: { tableName: 'users', columns, row, open: true },
      global: _config,
    })
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('id')
    expect(text).toContain('name')
  })

  it('row=null 时不报错', async () => {
    const { default: CShow } = await import('../../components/table/CShow.vue')
    const wrapper = mount(CShow, {
      props: { tableName: 'users', columns, row: null, open: true },
      global: _config,
    })
    await flushPromises()
    expect(wrapper.exists()).toBe(true)
  })

  it('点击 close 按钮关闭 modal', async () => {
    const { default: CShow } = await import('../../components/table/CShow.vue')
    const wrapper = mount(CShow, {
      props: { tableName: 'users', columns, row, open: true },
      global: _config,
    })
    await flushPromises()
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('update:open')).toBeTruthy()
    expect(wrapper.emitted('update:open')![0]).toEqual([false])
  })

  it('接受 fkLabels prop', async () => {
    const { default: CShow } = await import('../../components/table/CShow.vue')
    const cols = [
      makeColumn({ jsName: 'courseId', dataType: 'number', isAutoIncrement: false, isPrimaryKey: false, fkTable: 'courses' }),
    ]
    const wrapper = mount(CShow, {
      props: {
        tableName: 'users', columns: cols, row: { courseId: 5 }, open: true,
        fkLabels: { courseId: { 5: 'Vue 基础' } },
      },
      global: _config,
    })
    await flushPromises()
    expect(wrapper.exists()).toBe(true)
  })
})
