/**
 * Manager component tests
 * @see modules/admin/components/table/Manager.vue
 *
 * Manager is an orchestration component, combining 8 child components + 5 composables.
 * This test only verifies: mounts successfully, accepts tableName prop, child components are rendered,
 * Does not attempt to test full interaction flows (that requires e2e).
 */
import { describe, it, expect, beforeEach, mount, flushPromises, baseBeforeEach, _globalStubs, _globalConfig } from './_shared'

beforeEach(baseBeforeEach)

// Stub all child components, letting Manager only handle orchestration logic
const _stubs = {
  ..._globalStubs,
  TableFilterBar: { template: '<div class="filter-bar" />', props: ['columns', 'filters', 'search'] },
  ManagerToolbar: { template: '<div class="manager-toolbar" />', props: ['canEdit', 'exporting', 'includeDeleted', 'total', 'columns', 'hiddenColumns'] },
  ManagerBatchBar: { template: '<div class="manager-batch-bar" />', props: ['selectedRows', 'includeDeleted'] },
  TableView: { template: '<div class="table-view" />', props: ['visibleColumns', 'rows', 'selectedKeys', 'allSelected', 'sort', 'includeDeleted', 'canEdit', 'canDelete', 'hasId', 'pending', 'fkLabels', 'rowKeyOf'] },
  ManagerPagination: { template: '<div class="manager-pagination" />', props: ['page', 'pageSize', 'total'] },
  TableCForm: { template: '<div class="c-form" />', props: ['open', 'tableName', 'columns', 'row'] },
  TableCShow: { template: '<div class="c-show" />', props: ['open', 'tableName', 'columns', 'row', 'fkLabels'] },
  TableImportSheet: { template: '<div class="import-sheet" />', props: ['open', 'columns'] },
  TableExportSheet: { template: '<div class="export-sheet" />', props: ['open', 'columns', 'rows'] },
  ManagerConfirmDialog: { template: '<div class="confirm-dialog" />', props: ['open', 'text', 'color', 'loading'] },
}

const _config = { ..._globalConfig, stubs: _stubs }

describe('table/Manager.vue', () => {
  it('mounts 并接受 tableName prop', async () => {
    const { default: Manager } = await import('../../components/table/Manager.vue')
    const wrapper = mount(Manager, {
      props: { tableName: 'users' },
      global: _config,
    })
    await flushPromises()
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.props('tableName')).toBe('users')
  })

  it('渲染 FilterBar 子组件', async () => {
    const { default: Manager } = await import('../../components/table/Manager.vue')
    const wrapper = mount(Manager, {
      props: { tableName: 'users' },
      global: _config,
    })
    await flushPromises()
    expect(wrapper.find('.filter-bar').exists()).toBe(true)
  })

  it('渲染 ManagerToolbar 子组件', async () => {
    const { default: Manager } = await import('../../components/table/Manager.vue')
    const wrapper = mount(Manager, {
      props: { tableName: 'users' },
      global: _config,
    })
    await flushPromises()
    expect(wrapper.find('.manager-toolbar').exists()).toBe(true)
  })

  it('渲染 ManagerBatchBar 子组件', async () => {
    const { default: Manager } = await import('../../components/table/Manager.vue')
    const wrapper = mount(Manager, {
      props: { tableName: 'users' },
      global: _config,
    })
    await flushPromises()
    expect(wrapper.find('.manager-batch-bar').exists()).toBe(true)
  })

  it('渲染 TableView 子组件', async () => {
    const { default: Manager } = await import('../../components/table/Manager.vue')
    const wrapper = mount(Manager, {
      props: { tableName: 'users' },
      global: _config,
    })
    await flushPromises()
    expect(wrapper.find('.table-view').exists()).toBe(true)
  })

  it('渲染 ManagerPagination 子组件', async () => {
    const { default: Manager } = await import('../../components/table/Manager.vue')
    const wrapper = mount(Manager, {
      props: { tableName: 'users' },
      global: _config,
    })
    await flushPromises()
    expect(wrapper.find('.manager-pagination').exists()).toBe(true)
  })

  it('渲染所有弹窗子组件（CForm/CShow/ImportSheet/ExportSheet/ConfirmDialog）', async () => {
    const { default: Manager } = await import('../../components/table/Manager.vue')
    const wrapper = mount(Manager, {
      props: { tableName: 'users' },
      global: _config,
    })
    await flushPromises()
    expect(wrapper.find('.c-form').exists()).toBe(true)
    expect(wrapper.find('.c-show').exists()).toBe(true)
    expect(wrapper.find('.import-sheet').exists()).toBe(true)
    expect(wrapper.find('.export-sheet').exists()).toBe(true)
    expect(wrapper.find('.confirm-dialog').exists()).toBe(true)
  })

  it('切换 tableName prop 不报错', async () => {
    const { default: Manager } = await import('../../components/table/Manager.vue')
    const wrapper = mount(Manager, {
      props: { tableName: 'users' },
      global: _config,
    })
    await flushPromises()
    await wrapper.setProps({ tableName: 'courses' })
    await flushPromises()
    expect(wrapper.props('tableName')).toBe('courses')
    expect(wrapper.exists()).toBe(true)
  })
})
