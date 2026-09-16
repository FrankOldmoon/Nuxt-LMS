/**
 * ueditor/render/nodes/file.vue 组件测试
 * @see modules/lms/components/ueditor/render/nodes/file.vue
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
  stubs: {
    // 操作区改用 Nuxt UI 的 UButton（带 href 时 Nuxt UI 渲染为 <a>），测试里照此桩掉
    UButton: {
      template: '<a v-if="href" class="ubutton" :href="href" :download="download" :target="target"><slot /></a>'
        + '<button v-else class="ubutton" :aria-label="ariaLabel"><slot /></button>',
      props: ['icon', 'size', 'color', 'variant', 'href', 'download', 'target', 'aria-label'],
    },
    UTooltip: { template: '<span class="utooltip"><slot /></span>', props: ['text'] },
    UIcon: { template: '<span class="uicon" />', props: ['name'] },
  },
}

describe('ueditor/render/nodes/file.vue', () => {
  it('renders file name and download link', async () => {
    const { default: FileView } = await import('../../../../../components/ueditor/render/nodes/file.vue')
    const wrapper = mount(FileView, {
      props: { node: { type: 'file', attrs: { name: 'doc.pdf', url: 'https://example.com/doc.pdf', size: 1024 } } },
      global: _globalConfig,
    })
    expect(wrapper.find('.umo-node-file').exists()).toBe(true)
    expect(wrapper.text()).toContain('doc.pdf')
    // 下载按钮带 href（Nuxt UI 的 UButton 带 href 时渲染为 <a>）
    const link = wrapper.find(`a[href="https://example.com/doc.pdf"]`)
    expect(link.exists()).toBe(true)
    expect(link.attributes('download')).toBe('doc.pdf')
  })

  it('shows file icon image based on extension', async () => {
    const { default: FileView } = await import('../../../../../components/ueditor/render/nodes/file.vue')
    const wrapper = mount(FileView, {
      props: { node: { type: 'file', attrs: { name: 'report.xlsx', url: '/r.xlsx' } } },
      global: _globalConfig,
    })
    const iconImg = wrapper.find('.icon-file')
    expect(iconImg.exists()).toBe(true)
    expect(iconImg.attributes('src') || '').toContain('excel')
  })

  it('shows unknown name when name attr missing', async () => {
    const { default: FileView } = await import('../../../../../components/ueditor/render/nodes/file.vue')
    const wrapper = mount(FileView, {
      props: { node: { type: 'file', attrs: {} } },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('ueditor.file.unknown')
  })
})
