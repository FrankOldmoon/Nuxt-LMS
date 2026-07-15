/**
 * FilesFooter component tests
 * @see modules/base/components/files/footer.vue
 *
 * File list footer: total + pagination + confirm selection button
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UButton: {
    template: '<button @click="$emit(\'click\', $event)"><slot />{{ label }}</button>',
    props: ['color', 'size', 'label'],
    emits: ['click'],
  },
  UPagination: {
    template: '<div class="pagination" />',
    props: ['page', 'total', 'itemsPerPage', 'siblingCount'],
    emits: ['update:page'],
  },
}

const _globalConfig = {
  mocks: {
    $t: (k: string) => k,
    $i18n: { t: (k: string) => k, locale: { value: 'en' } },
  },
  stubs: _globalStubs,
}

describe('files/footer.vue', () => {
  it('渲染总数信息', async () => {
    const { default: FilesFooter } = await import('../../../components/files/footer.vue')
    const wrapper = mount(FilesFooter, {
      props: { total: 42, pageSize: 20, page: 1, selectedCount: 0 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('myFiles.total')
  })

  it('非 picker 模式不显示选择信息', async () => {
    const { default: FilesFooter } = await import('../../../components/files/footer.vue')
    const wrapper = mount(FilesFooter, {
      props: { total: 10, pageSize: 20, page: 1, selectedCount: 0 },
      global: _globalConfig,
    })
    expect(wrapper.text()).not.toContain('myFiles.selected')
  })

  it('picker + multiple 模式且有选中时显示选择数', async () => {
    const { default: FilesFooter } = await import('../../../components/files/footer.vue')
    const wrapper = mount(FilesFooter, {
      props: { picker: true, multiple: true, total: 10, pageSize: 20, page: 1, selectedCount: 3 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('myFiles.selected')
  })

  it('picker + multiple 模式且有选中时显示确认按钮', async () => {
    const { default: FilesFooter } = await import('../../../components/files/footer.vue')
    const wrapper = mount(FilesFooter, {
      props: { picker: true, multiple: true, total: 10, pageSize: 20, page: 1, selectedCount: 5 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('myFiles.confirmSelect')
  })

  it('picker + multiple 模式但无选中时不显示确认按钮', async () => {
    const { default: FilesFooter } = await import('../../../components/files/footer.vue')
    const wrapper = mount(FilesFooter, {
      props: { picker: true, multiple: true, total: 10, pageSize: 20, page: 1, selectedCount: 0 },
      global: _globalConfig,
    })
    expect(wrapper.text()).not.toContain('myFiles.confirmSelect')
  })

  it('渲染分页组件', async () => {
    const { default: FilesFooter } = await import('../../../components/files/footer.vue')
    const wrapper = mount(FilesFooter, {
      props: { total: 100, pageSize: 20, page: 1, selectedCount: 0 },
      global: _globalConfig,
    })
    expect(wrapper.find('.pagination').exists()).toBe(true)
  })
})
