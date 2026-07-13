/**
 * CForm 组件测试
 * @see modules/admin/components/table/CForm.vue
 */
import { describe, it, expect, beforeEach, mount, flushPromises, baseBeforeEach, _globalStubs, _globalConfig, makeColumn } from './_shared'

beforeEach(baseBeforeEach)

const _stubs = {
  ..._globalStubs,
  TableFormField: { template: '<div class="form-field">{{ col.jsName }}</div>', props: ['col', 'form', 'jsonStrings', 'jsonErrors', 'fkOptions', 'fkLoading', 'rowCourseId'] },
}

const _config = { ..._globalConfig, stubs: _stubs }

describe('table/CForm.vue', () => {
  const columns = [
    makeColumn({ jsName: 'id', dataType: 'number', isAutoIncrement: true }),
    makeColumn({ jsName: 'name', dataType: 'string', isAutoIncrement: false, isPrimaryKey: false }),
    makeColumn({ jsName: 'active', dataType: 'boolean', isAutoIncrement: false, isPrimaryKey: false }),
  ]

  it('mounts 并接受 props', async () => {
    const { default: CForm } = await import('../../components/table/CForm.vue')
    const wrapper = mount(CForm, {
      props: { tableName: 'users', columns, row: null, open: false },
      global: _config,
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.props('tableName')).toBe('users')
  })

  it('open=false 时不渲染 modal', async () => {
    const { default: CForm } = await import('../../components/table/CForm.vue')
    const wrapper = mount(CForm, {
      props: { tableName: 'users', columns, row: null, open: false },
      global: _config,
    })
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('open=true 时渲染 modal', async () => {
    const { default: CForm } = await import('../../components/table/CForm.vue')
    const wrapper = mount(CForm, {
      props: { tableName: 'users', columns, row: null, open: true },
      global: _config,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(true)
  })

  it('row=null 时显示新增标题', async () => {
    const { default: CForm } = await import('../../components/table/CForm.vue')
    const wrapper = mount(CForm, {
      props: { tableName: 'users', columns, row: null, open: true },
      global: _config,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('admin.table.addNew')
  })

  it('row 不为空时显示编辑标题', async () => {
    const { default: CForm } = await import('../../components/table/CForm.vue')
    const wrapper = mount(CForm, {
      props: { tableName: 'users', columns, row: { id: 1, name: 'Alice' }, open: true },
      global: _config,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('admin.table.editRecord')
  })

  it('渲染 save 和 cancel 按钮', async () => {
    const { default: CForm } = await import('../../components/table/CForm.vue')
    const wrapper = mount(CForm, {
      props: { tableName: 'users', columns, row: null, open: true },
      global: _config,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('admin.form.save')
    expect(wrapper.text()).toContain('admin.form.cancel')
  })

  it('为可编辑列渲染 TableFormField（排除 readonly）', async () => {
    const { default: CForm } = await import('../../components/table/CForm.vue')
    const cols = [
      makeColumn({ jsName: 'id', dataType: 'number', isAutoIncrement: true }),
      makeColumn({ jsName: 'name', dataType: 'string', isAutoIncrement: false, isPrimaryKey: false }),
      makeColumn({ jsName: 'createdAt', dataType: 'date', isAutoIncrement: false, isPrimaryKey: false, isTimestamp: true }),
    ]
    const wrapper = mount(CForm, {
      props: { tableName: 'users', columns: cols, row: null, open: true },
      global: _config,
    })
    await flushPromises()
    // id (readonly, isAutoIncrement) + createdAt (readonly) 被排除，只渲染 name
    const fields = wrapper.findAll('.form-field')
    expect(fields.length).toBe(1)
    expect(fields[0].text()).toBe('name')
  })

  it('open 从 false 变 true 时初始化表单', async () => {
    const { default: CForm } = await import('../../components/table/CForm.vue')
    const wrapper = mount(CForm, {
      props: { tableName: 'users', columns, row: null, open: false },
      global: _config,
    })
    await wrapper.setProps({ open: true })
    await flushPromises()
    // 表单字段已渲染（initForm 在 watch open 中触发）
    expect(wrapper.findAll('.form-field').length).toBeGreaterThan(0)
  })

  it('接受 columns prop 中含 json 类型', async () => {
    const { default: CForm } = await import('../../components/table/CForm.vue')
    const cols = [
      makeColumn({ jsName: 'meta', dataType: 'json', columnType: 'PgJSONB', isAutoIncrement: false, isPrimaryKey: false }),
    ]
    const wrapper = mount(CForm, {
      props: { tableName: 'users', columns: cols, row: null, open: true },
      global: _config,
    })
    await flushPromises()
    expect(wrapper.findAll('.form-field').length).toBe(1)
  })
})
