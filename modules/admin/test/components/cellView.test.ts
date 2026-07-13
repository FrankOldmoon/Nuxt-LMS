/**
 * CellView 组件测试
 * @see modules/admin/components/table/CellView.vue
 */
import { describe, it, expect, beforeEach, mount, flushPromises, baseBeforeEach, _globalStubs, _globalConfig, makeColumn } from './_shared'

beforeEach(baseBeforeEach)

const _stubs = {
  ..._globalStubs,
  TableCellImage: { template: '<div class="cell-image">{{ src }}</div>', props: ['value'] },
  TableCellFile: { template: '<div class="cell-file">{{ value }}</div>', props: ['value'] },
}

const _config = { ..._globalConfig, stubs: _stubs }

describe('table/CellView.vue', () => {
  it('空值渲染为 "-"', async () => {
    const { default: CellView } = await import('../../components/table/CellView.vue')
    const col = makeColumn({ jsName: 'name', dataType: 'string', isAutoIncrement: false, isPrimaryKey: false })
    const wrapper = mount(CellView, {
      props: { column: col, value: null },
      global: _config,
    })
    expect(wrapper.text()).toContain('-')
  })

  it('空字符串也渲染为 "-"', async () => {
    const { default: CellView } = await import('../../components/table/CellView.vue')
    const col = makeColumn({ jsName: 'name', dataType: 'string', isAutoIncrement: false, isPrimaryKey: false })
    const wrapper = mount(CellView, {
      props: { column: col, value: '' },
      global: _config,
    })
    expect(wrapper.text()).toContain('-')
  })

  it('文本类型渲染截断标签', async () => {
    const { default: CellView } = await import('../../components/table/CellView.vue')
    const col = makeColumn({ jsName: 'name', dataType: 'string', isAutoIncrement: false, isPrimaryKey: false })
    const wrapper = mount(CellView, {
      props: { column: col, value: 'hello world' },
      global: _config,
    })
    expect(wrapper.text()).toContain('hello world')
  })

  it('长文本截断到 60 字符 + 省略号', async () => {
    const { default: CellView } = await import('../../components/table/CellView.vue')
    const col = makeColumn({ jsName: 'name', dataType: 'string', isAutoIncrement: false, isPrimaryKey: false })
    const longText = 'x'.repeat(80)
    const wrapper = mount(CellView, {
      props: { column: col, value: longText },
      global: _config,
    })
    const text = wrapper.text()
    expect(text).toContain('…')
    expect(text.length).toBeLessThan(longText.length + 10)
  })

  it('布尔类型渲染为 badge', async () => {
    const { default: CellView } = await import('../../components/table/CellView.vue')
    const col = makeColumn({ jsName: 'active', dataType: 'boolean', isAutoIncrement: false, isPrimaryKey: false })
    const wrapper = mount(CellView, {
      props: { column: col, value: true },
      global: _config,
    })
    expect(wrapper.find('.ubadge').exists()).toBe(true)
    expect(wrapper.text()).toContain('admin.cell.true')
  })

  it('数字类型渲染千分位格式化', async () => {
    const { default: CellView } = await import('../../components/table/CellView.vue')
    const col = makeColumn({ jsName: 'count', dataType: 'number', isAutoIncrement: false, isPrimaryKey: false })
    const wrapper = mount(CellView, {
      props: { column: col, value: 1234567 },
      global: _config,
    })
    expect(wrapper.text()).toContain('1,234,567')
  })

  it('自增主键 id 渲染为 badge', async () => {
    const { default: CellView } = await import('../../components/table/CellView.vue')
    const col = makeColumn({ jsName: 'id', dataType: 'number', isAutoIncrement: true, isPrimaryKey: true })
    const wrapper = mount(CellView, {
      props: { column: col, value: 42 },
      global: _config,
    })
    expect(wrapper.find('.ubadge').exists()).toBe(true)
    expect(wrapper.text()).toContain('42')
  })

  it('密码类型渲染为脱敏', async () => {
    const { default: CellView } = await import('../../components/table/CellView.vue')
    const col = makeColumn({ jsName: 'password', dataType: 'string', isAutoIncrement: false, isPrimaryKey: false })
    const wrapper = mount(CellView, {
      props: { column: col, value: 'secret123' },
      global: _config,
    })
    expect(wrapper.text()).toContain('••••••')
    expect(wrapper.text()).not.toContain('secret123')
  })

  it('外键类型渲染 fkLabel（已解析标签）', async () => {
    const { default: CellView } = await import('../../components/table/CellView.vue')
    const col = makeColumn({ jsName: 'courseId', dataType: 'number', isAutoIncrement: false, isPrimaryKey: false, fkTable: 'courses' })
    const wrapper = mount(CellView, {
      props: { column: col, value: 5, fkLabel: 'Vue 基础' },
      global: _config,
    })
    expect(wrapper.text()).toContain('Vue 基础')
  })

  it('外键类型无 fkLabel 时渲染 #id', async () => {
    const { default: CellView } = await import('../../components/table/CellView.vue')
    const col = makeColumn({ jsName: 'courseId', dataType: 'number', isAutoIncrement: false, isPrimaryKey: false, fkTable: 'courses' })
    const wrapper = mount(CellView, {
      props: { column: col, value: 5 },
      global: _config,
    })
    expect(wrapper.text()).toContain('#5')
  })

  it('图片列渲染 TableCellImage 子组件', async () => {
    const { default: CellView } = await import('../../components/table/CellView.vue')
    const col = makeColumn({ jsName: 'avatarImg', dataType: 'string', isAutoIncrement: false, isPrimaryKey: false })
    const wrapper = mount(CellView, {
      props: { column: col, value: 'http://example.com/a.png' },
      global: _config,
    })
    expect(wrapper.find('.cell-image').exists()).toBe(true)
  })

  it('文件列渲染 TableCellFile 子组件', async () => {
    const { default: CellView } = await import('../../components/table/CellView.vue')
    const col = makeColumn({ jsName: 'files', dataType: 'string', isAutoIncrement: false, isPrimaryKey: false })
    const wrapper = mount(CellView, {
      props: { column: col, value: 'http://example.com/a.pdf' },
      global: _config,
    })
    expect(wrapper.find('.cell-file').exists()).toBe(true)
  })

  it('JSON 类型渲染 popover + badge', async () => {
    const { default: CellView } = await import('../../components/table/CellView.vue')
    const col = makeColumn({ jsName: 'meta', dataType: 'json', isAutoIncrement: false, isPrimaryKey: false, columnType: 'PgJSONB' })
    const wrapper = mount(CellView, {
      props: { column: col, value: { a: 1 } },
      global: _config,
    })
    expect(wrapper.find('.popover').exists()).toBe(true)
    expect(wrapper.text()).toContain('admin.cell.json')
  })
})
