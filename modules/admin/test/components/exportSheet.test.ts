/**
 * ExportSheet component tests
 * @see modules/admin/components/table/ExportSheet.vue
 */
import { describe, it, expect, beforeEach, mount, flushPromises, baseBeforeEach, _globalStubs, _globalConfig, makeColumn } from './_shared'

beforeEach(baseBeforeEach)

const _stubs = {
  ..._globalStubs,
  Sheet: { template: '<div class="sheet-stub">sheet</div>', props: ['headers', 'initialData', 'rowCount', 'showTools'] },
}

const _config = { ..._globalConfig, stubs: _stubs }

describe('table/ExportSheet.vue', () => {
  const columns = [
    makeColumn({ jsName: 'id', dataType: 'number' }),
    makeColumn({ jsName: 'name', dataType: 'string', isAutoIncrement: false, isPrimaryKey: false }),
  ]
  const rows = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ]

  it('mounts 并接受 props', async () => {
    const { default: ExportSheet } = await import('../../components/table/ExportSheet.vue')
    const wrapper = mount(ExportSheet, {
      props: { columns, rows, open: false },
      global: _config,
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.props('columns')).toStrictEqual(columns)
    expect(wrapper.props('rows')).toStrictEqual(rows)
  })

  it('open=false 时不渲染 modal', async () => {
    const { default: ExportSheet } = await import('../../components/table/ExportSheet.vue')
    const wrapper = mount(ExportSheet, {
      props: { columns, rows, open: false },
      global: _config,
    })
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('open=true 时渲染 modal', async () => {
    const { default: ExportSheet } = await import('../../components/table/ExportSheet.vue')
    const wrapper = mount(ExportSheet, {
      props: { columns, rows, open: true },
      global: _config,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(true)
    expect(wrapper.text()).toContain('admin.table.exportTitle')
  })

  it('渲染 exportHint 提示', async () => {
    const { default: ExportSheet } = await import('../../components/table/ExportSheet.vue')
    const wrapper = mount(ExportSheet, {
      props: { columns, rows, open: true },
      global: _config,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('admin.table.exportHint')
  })

  it('渲染 downloadCsv 按钮', async () => {
    const { default: ExportSheet } = await import('../../components/table/ExportSheet.vue')
    const wrapper = mount(ExportSheet, {
      props: { columns, rows, open: true },
      global: _config,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('admin.table.downloadCsv')
  })

  it('open=true 时渲染 Sheet 子组件', async () => {
    const { default: ExportSheet } = await import('../../components/table/ExportSheet.vue')
    const wrapper = mount(ExportSheet, {
      props: { columns, rows, open: true },
      global: _config,
    })
    await flushPromises()
    expect(wrapper.find('.sheet-stub').exists()).toBe(true)
  })

  it('open 从 false 变 true 时渲染 Sheet', async () => {
    const { default: ExportSheet } = await import('../../components/table/ExportSheet.vue')
    const wrapper = mount(ExportSheet, {
      props: { columns, rows, open: false },
      global: _config,
    })
    expect(wrapper.find('.sheet-stub').exists()).toBe(false)
    await wrapper.setProps({ open: true })
    await flushPromises()
    expect(wrapper.find('.sheet-stub').exists()).toBe(true)
  })

  it('点击 close 按钮关闭 modal（open=false）', async () => {
    const { default: ExportSheet } = await import('../../components/table/ExportSheet.vue')
    const wrapper = mount(ExportSheet, {
      props: { columns, rows, open: true },
      global: _config,
    })
    await flushPromises()
    // Find the close button (ghost button with i-lucide-x icon)
    const buttons = wrapper.findAll('button')
    // downloadCsv=0, close=1
    await buttons[1].trigger('click')
    // v-model:open should update
    expect(wrapper.emitted('update:open')).toBeTruthy()
    expect(wrapper.emitted('update:open')![0]).toEqual([false])
  })
})
