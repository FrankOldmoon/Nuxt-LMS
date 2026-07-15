/**
 * ColumnToggle component tests
 * @see modules/admin/components/table/ColumnToggle.vue
 */
import { describe, it, expect, beforeEach, mount, baseBeforeEach, _globalConfig, makeColumn } from './_shared'

beforeEach(baseBeforeEach)

describe('table/ColumnToggle.vue', () => {
  const columns = [
    makeColumn({ jsName: 'id', dataType: 'number' }),
    makeColumn({ jsName: 'name', dataType: 'string', isAutoIncrement: false, isPrimaryKey: false }),
    makeColumn({ jsName: 'email', dataType: 'string', isAutoIncrement: false, isPrimaryKey: false }),
  ]

  it('mounts 并接受 props', async () => {
    const { default: ColumnToggle } = await import('../../components/table/ColumnToggle.vue')
    const wrapper = mount(ColumnToggle, {
      props: { columns, hidden: new Set() },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.props('columns')).toStrictEqual(columns)
  })

  it('渲染触发按钮（columns 标签）', async () => {
    const { default: ColumnToggle } = await import('../../components/table/ColumnToggle.vue')
    const wrapper = mount(ColumnToggle, {
      props: { columns, hidden: new Set() },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('admin.table.columns')
  })

  it('渲染所有列在 popover 内容中', async () => {
    const { default: ColumnToggle } = await import('../../components/table/ColumnToggle.vue')
    const wrapper = mount(ColumnToggle, {
      props: { columns, hidden: new Set() },
      global: _globalConfig,
    })
    const text = wrapper.text()
    expect(text).toContain('id')
    expect(text).toContain('name')
    expect(text).toContain('email')
  })

  it('渲染 showAll 按钮', async () => {
    const { default: ColumnToggle } = await import('../../components/table/ColumnToggle.vue')
    const wrapper = mount(ColumnToggle, {
      props: { columns, hidden: new Set() },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('admin.table.showAll')
  })

  it('渲染 checkbox（每个列一个）', async () => {
    const { default: ColumnToggle } = await import('../../components/table/ColumnToggle.vue')
    const wrapper = mount(ColumnToggle, {
      props: { columns, hidden: new Set() },
      global: _globalConfig,
    })
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect(checkboxes.length).toBe(3)
  })

  it('hidden 包含某列时该 checkbox 未选中', async () => {
    const { default: ColumnToggle } = await import('../../components/table/ColumnToggle.vue')
    const wrapper = mount(ColumnToggle, {
      props: { columns, hidden: new Set(['name']) },
      global: _globalConfig,
    })
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    // The second (name) is unchecked
    expect((checkboxes[1].element as HTMLInputElement).checked).toBe(false)
    // The first (id) is checked
    expect((checkboxes[0].element as HTMLInputElement).checked).toBe(true)
  })

  it('点击 checkbox 触发 toggle 事件', async () => {
    const { default: ColumnToggle } = await import('../../components/table/ColumnToggle.vue')
    const wrapper = mount(ColumnToggle, {
      props: { columns, hidden: new Set() },
      global: _globalConfig,
    })
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    await checkboxes[1].trigger('change')
    expect(wrapper.emitted('toggle')).toBeTruthy()
    expect(wrapper.emitted('toggle')![0]).toEqual(['name'])
  })

  it('点击 showAll 按钮触发 showAll 事件', async () => {
    const { default: ColumnToggle } = await import('../../components/table/ColumnToggle.vue')
    const wrapper = mount(ColumnToggle, {
      props: { columns, hidden: new Set(['name']) },
      global: _globalConfig,
    })
    // showAll is the button inside the popover
    const buttons = wrapper.findAll('button')
    // The first button is the trigger, the second is showAll
    await buttons[1].trigger('click')
    expect(wrapper.emitted('showAll')).toBeTruthy()
  })

  it('显示每列的 dataType', async () => {
    const { default: ColumnToggle } = await import('../../components/table/ColumnToggle.vue')
    const wrapper = mount(ColumnToggle, {
      props: { columns, hidden: new Set() },
      global: _globalConfig,
    })
    const text = wrapper.text()
    // dataType is shown on the right side of each column
    expect(text).toContain('number')
    expect(text).toContain('string')
  })
})
