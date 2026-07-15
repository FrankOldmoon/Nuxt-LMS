/**
 * cellFile component tests
 * @see modules/admin/components/table/cellFile.vue
 */
import { describe, it, expect, beforeEach, mount, baseBeforeEach, _globalConfig } from './_shared'

beforeEach(baseBeforeEach)

describe('table/cellFile.vue', () => {
  it('渲染文件数量 badge', async () => {
    const { default: CellFile } = await import('../../components/table/cellFile.vue')
    const wrapper = mount(CellFile, {
      props: { value: 'http://example.com/a.pdf' },
      global: _globalConfig,
    })
    // admin.cell.files {n:1} → admin.cell.files (mock does not parse {n})
    expect(wrapper.text()).toContain('admin.cell.files')
  })

  it('解析 JSON 数组字符串', async () => {
    const { default: CellFile } = await import('../../components/table/cellFile.vue')
    const wrapper = mount(CellFile, {
      props: { value: '["http://a.com/1.pdf","http://b.com/2.pdf"]' },
      global: _globalConfig,
    })
    // Rendered popover + content slot
    expect(wrapper.find('.popover').exists()).toBe(true)
    // Content area contains two links
    const links = wrapper.findAll('a')
    expect(links.length).toBe(2)
  })

  it('解析换行分隔的字符串', async () => {
    const { default: CellFile } = await import('../../components/table/cellFile.vue')
    const wrapper = mount(CellFile, {
      props: { value: 'http://a.com/1.pdf\nhttp://b.com/2.pdf\nhttp://c.com/3.pdf' },
      global: _globalConfig,
    })
    const links = wrapper.findAll('a')
    expect(links.length).toBe(3)
  })

  it('解析逗号分隔的字符串', async () => {
    const { default: CellFile } = await import('../../components/table/cellFile.vue')
    const wrapper = mount(CellFile, {
      props: { value: 'http://a.com/1.pdf,http://b.com/2.pdf' },
      global: _globalConfig,
    })
    const links = wrapper.findAll('a')
    expect(links.length).toBe(2)
  })

  it('解析单个 URL 字符串', async () => {
    const { default: CellFile } = await import('../../components/table/cellFile.vue')
    const wrapper = mount(CellFile, {
      props: { value: 'http://a.com/only.pdf' },
      global: _globalConfig,
    })
    const links = wrapper.findAll('a')
    expect(links.length).toBe(1)
    expect(links[0].attributes('href')).toBe('http://a.com/only.pdf')
  })

  it('解析数组类型 value', async () => {
    const { default: CellFile } = await import('../../components/table/cellFile.vue')
    const wrapper = mount(CellFile, {
      props: { value: ['http://a.com/1.pdf', 'http://b.com/2.pdf'] },
      global: _globalConfig,
    })
    const links = wrapper.findAll('a')
    expect(links.length).toBe(2)
  })

  it('空 value 渲染空状态', async () => {
    const { default: CellFile } = await import('../../components/table/cellFile.vue')
    const wrapper = mount(CellFile, {
      props: { value: '' },
      global: _globalConfig,
    })
    // Content area shows empty hint
    expect(wrapper.text()).toContain('admin.cell.empty')
  })

  it('空数组 value 渲染空状态', async () => {
    const { default: CellFile } = await import('../../components/table/cellFile.vue')
    const wrapper = mount(CellFile, {
      props: { value: [] },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('admin.cell.empty')
  })

  it('过滤数组中的 falsy 值', async () => {
    const { default: CellFile } = await import('../../components/table/cellFile.vue')
    const wrapper = mount(CellFile, {
      props: { value: ['http://a.com/1.pdf', '', null, 'http://b.com/2.pdf'] },
      global: _globalConfig,
    })
    const links = wrapper.findAll('a')
    expect(links.length).toBe(2)
  })

  it('链接 target 为 _blank', async () => {
    const { default: CellFile } = await import('../../components/table/cellFile.vue')
    const wrapper = mount(CellFile, {
      props: { value: 'http://a.com/x.pdf' },
      global: _globalConfig,
    })
    const link = wrapper.find('a')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener')
  })
})
