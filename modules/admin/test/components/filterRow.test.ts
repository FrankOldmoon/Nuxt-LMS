/**
 * filterRow component tests
 * @see modules/admin/components/table/filterRow.vue
 */
import { describe, it, expect, beforeEach, mount, baseBeforeEach, _globalConfig, makeColumn } from './_shared'

beforeEach(baseBeforeEach)

describe('table/filterRow.vue', () => {
  const columns = [
    makeColumn({ jsName: 'id', dataType: 'number' }),
    makeColumn({ jsName: 'name', dataType: 'string', isAutoIncrement: false, isPrimaryKey: false }),
    makeColumn({ jsName: 'active', dataType: 'boolean', isAutoIncrement: false, isPrimaryKey: false }),
  ]

  it('渲染列选择、操作符选择、值输入、删除按钮', async () => {
    const { default: FilterRow } = await import('../../components/table/filterRow.vue')
    const wrapper = mount(FilterRow, {
      props: { filter: { column: 'name', op: 'eq', value: 'x' }, columns },
      global: _globalConfig,
    })
    // 2 select + 1 input + 1 button = 4 interactive elements
    expect(wrapper.findAll('select').length).toBe(2)
    expect(wrapper.findAll('input').length).toBe(1)
    expect(wrapper.findAll('button').length).toBe(1)
  })

  it('number 类型列渲染 number input', async () => {
    const { default: FilterRow } = await import('../../components/table/filterRow.vue')
    const wrapper = mount(FilterRow, {
      props: { filter: { column: 'id', op: 'eq', value: 1 }, columns },
      global: _globalConfig,
    })
    const input = wrapper.find('input')
    expect(input.attributes('type')).toBe('number')
  })

  it('boolean 类型列渲染 select（true/false 选项）', async () => {
    const { default: FilterRow } = await import('../../components/table/filterRow.vue')
    const wrapper = mount(FilterRow, {
      props: { filter: { column: 'active', op: 'eq', value: true }, columns },
      global: _globalConfig,
    })
    // op=eq, boolean type goes through USelect branch
    const selects = wrapper.findAll('select')
    // Column select + operator select + boolean value select = 3
    expect(selects.length).toBe(3)
  })

  it('string 类型列渲染普通 input', async () => {
    const { default: FilterRow } = await import('../../components/table/filterRow.vue')
    const wrapper = mount(FilterRow, {
      props: { filter: { column: 'name', op: 'eq', value: 'x' }, columns },
      global: _globalConfig,
    })
    const input = wrapper.find('input')
    expect(input.attributes('type')).toBeUndefined()
  })

  it('op=null 时不渲染值输入', async () => {
    const { default: FilterRow } = await import('../../components/table/filterRow.vue')
    const wrapper = mount(FilterRow, {
      props: { filter: { column: 'name', op: 'null', value: '' }, columns },
      global: _globalConfig,
    })
    // Only column select + op select + remove button remain, no input
    expect(wrapper.findAll('input').length).toBe(0)
  })

  it('op=notnull 时不渲染值输入', async () => {
    const { default: FilterRow } = await import('../../components/table/filterRow.vue')
    const wrapper = mount(FilterRow, {
      props: { filter: { column: 'name', op: 'notnull', value: '' }, columns },
      global: _globalConfig,
    })
    expect(wrapper.findAll('input').length).toBe(0)
  })

  it('点击删除按钮触发 remove 事件', async () => {
    const { default: FilterRow } = await import('../../components/table/filterRow.vue')
    const wrapper = mount(FilterRow, {
      props: { filter: { column: 'name', op: 'eq', value: 'x' }, columns },
      global: _globalConfig,
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('remove')).toBeTruthy()
  })

  it('opItems 包含所有操作符', async () => {
    const { default: FilterRow } = await import('../../components/table/filterRow.vue')
    const wrapper = mount(FilterRow, {
      props: { filter: { column: 'name', op: 'eq', value: '' }, columns },
      global: _globalConfig,
    })
    // Options of the operator select (the second select)
    const opSelect = wrapper.findAll('select')[1]
    const options = opSelect.findAll('option')
    // 10 operators
    expect(options.length).toBe(10)
    const values = options.map(o => o.attributes('value'))
    expect(values).toContain('eq')
    expect(values).toContain('ne')
    expect(values).toContain('contains')
    expect(values).toContain('gt')
    expect(values).toContain('lt')
    expect(values).toContain('gte')
    expect(values).toContain('lte')
    expect(values).toContain('in')
    expect(values).toContain('null')
    expect(values).toContain('notnull')
  })

  it('columnItems 过滤自增列（id 例外）', async () => {
    const { default: FilterRow } = await import('../../components/table/filterRow.vue')
    const cols = [
      makeColumn({ jsName: 'id', dataType: 'number', isAutoIncrement: true }),
      makeColumn({ jsName: 'createdAt', dataType: 'date', isAutoIncrement: true, isTimestamp: true, isPrimaryKey: false }),
      makeColumn({ jsName: 'name', dataType: 'string', isAutoIncrement: false, isPrimaryKey: false }),
    ]
    const wrapper = mount(FilterRow, {
      props: { filter: { column: 'name', op: 'eq', value: '' }, columns: cols },
      global: _globalConfig,
    })
    const colSelect = wrapper.findAll('select')[0]
    const options = colSelect.findAll('option')
    // id kept, createdAt filtered (auto-increment), name kept → 2
    expect(options.length).toBe(2)
    const values = options.map(o => o.attributes('value'))
    expect(values).toContain('id')
    expect(values).toContain('name')
    expect(values).not.toContain('createdAt')
  })
})
