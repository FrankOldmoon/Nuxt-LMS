/**
 * ueditor/render/nodes/file.vue component test
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
  stubs: {},
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
    const link = wrapper.find('a')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('https://example.com/doc.pdf')
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
