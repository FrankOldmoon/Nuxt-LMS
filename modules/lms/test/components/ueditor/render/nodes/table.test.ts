/**
 * ueditor/render/nodes/table.vue 组件测试
 * @see modules/lms/components/ueditor/render/nodes/table.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalConfig = {
  mocks: { $t: (k: string) => k, $i18n: { t: (k: string) => k, locale: { value: 'en' } } },
  stubs: {},
}

describe('ueditor/render/nodes/table.vue', () => {
  it('renders a <table> with tbody', async () => {
    const { default: Table } = await import('../../../../../components/ueditor/render/nodes/table.vue')
    const wrapper = mount(Table, {
      props: { node: { type: 'table', content: [{ type: 'tableRow', content: [] }] } },
      global: _globalConfig,
    })
    expect(wrapper.find('table').exists()).toBe(true)
    expect(wrapper.find('tbody').exists()).toBe(true)
  })

  it('从首行单元格 colwidth 生成 colgroup 还原列宽', async () => {
    const { default: Table } = await import('../../../../../components/ueditor/render/nodes/table.vue')
    const wrapper = mount(Table, {
      props: {
        node: {
          type: 'table',
          content: [{
            type: 'tableRow',
            content: [
              { type: 'tableHeader', attrs: { colwidth: [100] }, content: [] },
              { type: 'tableHeader', attrs: { colwidth: [200] }, content: [] },
            ],
          }],
        },
      },
      global: _globalConfig,
    })
    const cols = wrapper.findAll('colgroup col')
    expect(cols).toHaveLength(2)
    expect(cols[0].attributes('style')).toContain('width: 100px')
    expect(cols[1].attributes('style')).toContain('width: 200px')
  })

  it('合并单元格 colwidth 多值展开为多列', async () => {
    const { default: Table } = await import('../../../../../components/ueditor/render/nodes/table.vue')
    const wrapper = mount(Table, {
      props: {
        node: {
          type: 'table',
          content: [{
            type: 'tableRow',
            content: [
              { type: 'tableHeader', attrs: { colspan: 2, colwidth: [120, 80] }, content: [] },
              { type: 'tableHeader', attrs: { colwidth: [150] }, content: [] },
            ],
          }],
        },
      },
      global: _globalConfig,
    })
    const cols = wrapper.findAll('colgroup col')
    expect(cols).toHaveLength(3)
    expect(cols[0].attributes('style')).toContain('width: 120px')
    expect(cols[1].attributes('style')).toContain('width: 80px')
    expect(cols[2].attributes('style')).toContain('width: 150px')
  })

  it('无 colwidth 时不给 col 设置宽度', async () => {
    const { default: Table } = await import('../../../../../components/ueditor/render/nodes/table.vue')
    const wrapper = mount(Table, {
      props: {
        node: {
          type: 'table',
          content: [{
            type: 'tableRow',
            content: [
              { type: 'tableHeader', attrs: {}, content: [] },
              { type: 'tableHeader', attrs: {}, content: [] },
            ],
          }],
        },
      },
      global: _globalConfig,
    })
    const cols = wrapper.findAll('colgroup col')
    expect(cols).toHaveLength(2)
    expect(cols[0].attributes('style')).toBeFalsy()
    expect(cols[1].attributes('style')).toBeFalsy()
  })
})
