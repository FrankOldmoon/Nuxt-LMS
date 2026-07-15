/**
 * FilterBar component tests
 * @see modules/admin/components/table/FilterBar.vue
 */
import { describe, it, expect, beforeEach, mount, baseBeforeEach, _globalStubs, _globalConfig, makeColumn } from './_shared'

beforeEach(baseBeforeEach)

const _stubs = {
  ..._globalStubs,
  TableFilterRow: { template: '<div class="filter-row">{{ filter.column }}</div>', props: ['filter', 'columns'] },
}

const _config = { ..._globalConfig, stubs: _stubs }

describe('table/FilterBar.vue', () => {
  const columns = [
    makeColumn({ jsName: 'id', dataType: 'number' }),
    makeColumn({ jsName: 'name', dataType: 'string', isAutoIncrement: false, isPrimaryKey: false }),
  ]

  it('渲染搜索输入框', async () => {
    const { default: FilterBar } = await import('../../components/table/FilterBar.vue')
    const wrapper = mount(FilterBar, {
      props: { columns, filters: [], search: '' },
      global: _config,
    })
    expect(wrapper.find('input').exists()).toBe(true)
  })

  it('搜索框 value 来自 search prop', async () => {
    const { default: FilterBar } = await import('../../components/table/FilterBar.vue')
    const wrapper = mount(FilterBar, {
      props: { columns, filters: [], search: 'keyword' },
      global: _config,
    })
    expect(wrapper.find('input').element.value).toBe('keyword')
  })

  it('输入时触发 update:search 事件', async () => {
    const { default: FilterBar } = await import('../../components/table/FilterBar.vue')
    const wrapper = mount(FilterBar, {
      props: { columns, filters: [], search: '' },
      global: _config,
    })
    await wrapper.find('input').setValue('new keyword')
    expect(wrapper.emitted('update:search')).toBeTruthy()
    expect(wrapper.emitted('update:search')![0]).toEqual(['new keyword'])
  })

  it('点击 add 按钮触发 update:filters，新增一个筛选条件', async () => {
    const { default: FilterBar } = await import('../../components/table/FilterBar.vue')
    const wrapper = mount(FilterBar, {
      props: { columns, filters: [], search: '' },
      global: _config,
    })
    // Find the add button (label is admin.table.filterAdd)
    const buttons = wrapper.findAll('button')
    // The first button is add
    await buttons[0].trigger('click')
    expect(wrapper.emitted('update:filters')).toBeTruthy()
    const emitted = wrapper.emitted('update:filters')![0] as any[]
    expect(emitted[0]).toHaveLength(1)
    expect(emitted[0][0].column).toBe('id')
    expect(emitted[0][0].op).toBe('eq')
  })

  it('有 filters 时点击 clear 触发 update:filters 空数组', async () => {
    const { default: FilterBar } = await import('../../components/table/FilterBar.vue')
    const wrapper = mount(FilterBar, {
      props: { columns, filters: [{ column: 'name', op: 'eq', value: 'x' }], search: '' },
      global: _config,
    })
    // filterRow rendered
    expect(wrapper.findAll('.filter-row').length).toBe(1)
    // clear button (label admin.table.filterClear)
    const buttons = wrapper.findAll('button')
    // add=0, clear=1
    await buttons[1].trigger('click')
    expect(wrapper.emitted('update:filters')).toBeTruthy()
    expect(wrapper.emitted('update:filters')![0]).toEqual([[]])
  })

  it('为每个 filter 渲染 TableFilterRow', async () => {
    const { default: FilterBar } = await import('../../components/table/FilterBar.vue')
    const wrapper = mount(FilterBar, {
      props: {
        columns, filters: [
          { column: 'id', op: 'eq', value: 1 },
          { column: 'name', op: 'contains', value: 'a' },
        ], search: '',
      },
      global: _config,
    })
    expect(wrapper.findAll('.filter-row').length).toBe(2)
  })

  it('filters 为空时不渲染 TableFilterRow', async () => {
    const { default: FilterBar } = await import('../../components/table/FilterBar.vue')
    const wrapper = mount(FilterBar, {
      props: { columns, filters: [], search: '' },
      global: _config,
    })
    expect(wrapper.findAll('.filter-row').length).toBe(0)
  })

  it('columns 为空数组时 add 仍可用（默认 column=id）', async () => {
    const { default: FilterBar } = await import('../../components/table/FilterBar.vue')
    const wrapper = mount(FilterBar, {
      props: { columns: [], filters: [], search: '' },
      global: _config,
    })
    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    expect(wrapper.emitted('update:filters')).toBeTruthy()
    const emitted = wrapper.emitted('update:filters')![0] as any[]
    // columns[0]?.jsName is undefined → fallback to 'id'
    expect(emitted[0][0].column).toBe('id')
  })
})
