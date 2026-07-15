/**
 * ImportSheet component tests
 * @see modules/admin/components/table/ImportSheet.vue
 */
import { describe, it, expect, beforeEach, mount, flushPromises, baseBeforeEach, _globalStubs, _globalConfig, makeColumn } from './_shared'

beforeEach(baseBeforeEach)

const _stubs = {
  ..._globalStubs,
  Sheet: { template: '<div class="sheet-stub">sheet</div>', props: ['headers', 'initialData', 'rowCount', 'showTools'] },
}

const _config = { ..._globalConfig, stubs: _stubs }

describe('table/ImportSheet.vue', () => {
  const columns = [
    makeColumn({ jsName: 'id', dataType: 'number' }),
    makeColumn({ jsName: 'name', dataType: 'string', isAutoIncrement: false, isPrimaryKey: false }),
  ]

  it('mounts 并接受 columns prop', async () => {
    const { default: ImportSheet } = await import('../../components/table/ImportSheet.vue')
    const wrapper = mount(ImportSheet, {
      props: { columns },
      global: _config,
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.props('columns')).toStrictEqual(columns)
  })

  it('open=false 时不渲染 modal 内容', async () => {
    const { default: ImportSheet } = await import('../../components/table/ImportSheet.vue')
    const wrapper = mount(ImportSheet, {
      props: { columns, open: false },
      global: _config,
    })
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('open=true 时渲染 modal 内容', async () => {
    const { default: ImportSheet } = await import('../../components/table/ImportSheet.vue')
    const wrapper = mount(ImportSheet, {
      props: { columns, open: true },
      global: _config,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(true)
    expect(wrapper.text()).toContain('admin.table.importTitle')
  })

  it('渲染下载模板按钮', async () => {
    const { default: ImportSheet } = await import('../../components/table/ImportSheet.vue')
    const wrapper = mount(ImportSheet, {
      props: { columns, open: true },
      global: _config,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('admin.table.downloadTemplate')
  })

  it('渲染确认导入按钮', async () => {
    const { default: ImportSheet } = await import('../../components/table/ImportSheet.vue')
    const wrapper = mount(ImportSheet, {
      props: { columns, open: true },
      global: _config,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('admin.table.importConfirm')
  })

  it('open 从 false 变 true 时渲染 Sheet', async () => {
    const { default: ImportSheet } = await import('../../components/table/ImportSheet.vue')
    const wrapper = mount(ImportSheet, {
      props: { columns, open: false },
      global: _config,
    })
    expect(wrapper.find('.sheet-stub').exists()).toBe(false)
    await wrapper.setProps({ open: true })
    await flushPromises()
    expect(wrapper.find('.sheet-stub').exists()).toBe(true)
  })

  it('提示文案来自 importHint', async () => {
    const { default: ImportSheet } = await import('../../components/table/ImportSheet.vue')
    const wrapper = mount(ImportSheet, {
      props: { columns, open: true },
      global: _config,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('admin.table.importHint')
  })
})
