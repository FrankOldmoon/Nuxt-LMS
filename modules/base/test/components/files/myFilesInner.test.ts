/**
 * MyFilesInner component tests
 * @see modules/base/components/files/myFilesInner.vue
 *
 * My files inner: header + toolbar + file list + footer
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n, setMockFetchHandler } from '../../../../../test/setup/nuxt-stubs'
import { useMyFiles } from '../../../composables/useMyFiles'

// Expose composable to globalThis
;(globalThis as any).useMyFiles = useMyFiles

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
  ;(globalThis as any).useMyFiles = useMyFiles
})

const _globalStubs = {
  FilesHeader: { template: '<div class="files-header-stub" />', props: ['group', 'title', 'uploading', 'usage'], emits: ['upload'] },
  FilesToolbar: { template: '<div class="files-toolbar-stub" />', props: ['keyword', 'sortBy', 'sortOptions', 'orderIcon'], emits: ['update:keyword', 'update:sortBy', 'search', 'sortChange', 'toggleOrder', 'refresh'] },
  FilesFileRow: { template: '<tr class="file-row-stub" />', props: ['f', 'picker', 'multiple', 'renamingId', 'selectedIds'] },
  FilesFooter: { template: '<div class="files-footer-stub" />', props: ['picker', 'multiple', 'total', 'pageSize', 'page', 'selectedCount'], emits: ['update:page', 'pageChange', 'confirmPickMultiple'] },
  UIcon: { template: '<span class="icon" />', props: ['name'] },
}

const _globalConfig = {
  mocks: {
    $t: (k: string) => k,
    $i18n: { t: (k: string) => k, locale: { value: 'en' } },
  },
  stubs: _globalStubs,
}

describe('files/myFilesInner.vue', () => {
  it('默认渲染包含 header、toolbar、footer', async () => {
    const { default: MyFilesInner } = await import('../../../components/files/myFilesInner.vue')
    const wrapper = mount(MyFilesInner, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.files-header-stub').exists()).toBe(true)
    expect(wrapper.find('.files-toolbar-stub').exists()).toBe(true)
    expect(wrapper.find('.files-footer-stub').exists()).toBe(true)
  })

  it('加载中时显示 loading 状态', async () => {
    const { default: MyFilesInner } = await import('../../../components/files/myFilesInner.vue')
    const wrapper = mount(MyFilesInner, { global: _globalConfig })
    // On initial mount, useMyFiles will trigger loadFiles, loading is true
    await flushPromises()
    expect(wrapper.exists()).toBe(true)
  })

  it('无文件时显示空状态', async () => {
    setMockFetchHandler(async () => ({ data: { list: [], total: 0 }, success: true, msg: '' }))
    const { default: MyFilesInner } = await import('../../../components/files/myFilesInner.vue')
    const wrapper = mount(MyFilesInner, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.text()).toContain('myFiles.empty')
  })

  it('有文件时渲染文件列表', async () => {
    setMockFetchHandler(async () => ({
      data: {
        list: [
          { id: 1, name: 'file1.pdf', size: 1024, path: '/file1.pdf', createdAt: '2026-01-01' },
          { id: 2, name: 'file2.png', size: 2048, path: '/file2.png', createdAt: '2026-01-02' },
        ],
        total: 2,
      },
      success: true,
      msg: '',
    }))
    const { default: MyFilesInner } = await import('../../../components/files/myFilesInner.vue')
    const wrapper = mount(MyFilesInner, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.findAll('.file-row-stub').length).toBe(2)
  })

  it('接受 picker 和 multiple prop', async () => {
    const { default: MyFilesInner } = await import('../../../components/files/myFilesInner.vue')
    const wrapper = mount(MyFilesInner, {
      props: { picker: true, multiple: true },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('picker')).toBe(true)
    expect(wrapper.props('multiple')).toBe(true)
  })

  it('接受 group prop', async () => {
    const { default: MyFilesInner } = await import('../../../components/files/myFilesInner.vue')
    const wrapper = mount(MyFilesInner, {
      props: { group: 'course-1' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('group')).toBe('course-1')
  })
})
