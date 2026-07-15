/**
 * managerPagination component tests
 * @see modules/admin/components/table/managerPagination.vue
 */
import { describe, it, expect, beforeEach, mount, baseBeforeEach, _globalConfig } from './_shared'

beforeEach(baseBeforeEach)

describe('table/managerPagination.vue', () => {
  it('mounts 并接受 props', async () => {
    const { default: ManagerPagination } = await import('../../components/table/managerPagination.vue')
    const wrapper = mount(ManagerPagination, {
      props: { page: 1, pageSize: 20, total: 100 },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.props('page')).toBe(1)
    expect(wrapper.props('pageSize')).toBe(20)
    expect(wrapper.props('total')).toBe(100)
  })

  it('渲染 pageSize select（含 10/20/50/100 选项）', async () => {
    const { default: ManagerPagination } = await import('../../components/table/managerPagination.vue')
    const wrapper = mount(ManagerPagination, {
      props: { page: 1, pageSize: 20, total: 100 },
      global: _globalConfig,
    })
    const select = wrapper.find('select')
    expect(select.exists()).toBe(true)
    const options = select.findAll('option')
    expect(options.length).toBe(4)
    const values = options.map(o => o.attributes('value'))
    expect(values).toContain('10')
    expect(values).toContain('20')
    expect(values).toContain('50')
    expect(values).toContain('100')
  })

  it('渲染 pagination 组件', async () => {
    const { default: ManagerPagination } = await import('../../components/table/managerPagination.vue')
    const wrapper = mount(ManagerPagination, {
      props: { page: 1, pageSize: 20, total: 100 },
      global: _globalConfig,
    })
    expect(wrapper.find('.pagination').exists()).toBe(true)
  })

  it('pagination 显示当前页码', async () => {
    const { default: ManagerPagination } = await import('../../components/table/managerPagination.vue')
    const wrapper = mount(ManagerPagination, {
      props: { page: 3, pageSize: 20, total: 100 },
      global: _globalConfig,
    })
    expect(wrapper.find('.pagination').text()).toContain('3')
  })

  it('改变 pageSize select 触发 set-page-size 事件', async () => {
    const { default: ManagerPagination } = await import('../../components/table/managerPagination.vue')
    const wrapper = mount(ManagerPagination, {
      props: { page: 1, pageSize: 20, total: 100 },
      global: _globalConfig,
    })
    const select = wrapper.find('select')
    await select.setValue('50')
    expect(wrapper.emitted('set-page-size')).toBeTruthy()
    expect(wrapper.emitted('set-page-size')![0]).toEqual(['50'])
  })

  it('点击 pagination next 触发 set-page 事件', async () => {
    const { default: ManagerPagination } = await import('../../components/table/managerPagination.vue')
    const wrapper = mount(ManagerPagination, {
      props: { page: 1, pageSize: 20, total: 100 },
      global: _globalConfig,
    })
    const nextBtn = wrapper.find('.next')
    await nextBtn.trigger('click')
    expect(wrapper.emitted('set-page')).toBeTruthy()
    expect(wrapper.emitted('set-page')![0]).toEqual([2])
  })

  it('点击 pagination prev 不低于 1', async () => {
    const { default: ManagerPagination } = await import('../../components/table/managerPagination.vue')
    const wrapper = mount(ManagerPagination, {
      props: { page: 1, pageSize: 20, total: 100 },
      global: _globalConfig,
    })
    const prevBtn = wrapper.find('.prev')
    await prevBtn.trigger('click')
    expect(wrapper.emitted('set-page')![0]).toEqual([1])
  })
})
