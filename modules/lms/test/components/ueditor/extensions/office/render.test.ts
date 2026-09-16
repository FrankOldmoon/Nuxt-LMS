/**
 * office/render.vue 组件测试
 * @see modules/lms/components/ueditor/extensions/nodes/vue/office/render.vue
 *
 * 两条渲染路径：
 * - vue-office 支持的格式（docx / xlsx·xls·csv / pptx）：fetch 文件 + ClientOnly 本地渲染
 * - 旧格式（doc / ppt / rtf ...）：回退 MS Office Online 在线嵌入 iframe
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

// vue-office 组件是动态 import 的，测试里用桩替换（避免真的加载重依赖）
vi.mock('@vue-office/excel', () => ({
  VueOfficeExcel: { name: 'VueOfficeExcel', template: '<div class="vo-excel" />' },
}))

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // 默认让 fetch 成功返回一个小 buffer，避免测试真的联网
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    arrayBuffer: async () => new ArrayBuffer(8),
  }))
})

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  // ClientOnly 是 Nuxt 内置组件，测试里用透传 slot 的桩替代
  stubs: { ClientOnly: { template: '<slot />' } },
}

async function mountOffice(config: any) {
  const { default: OfficeRender } = await import(
    '../../../../../components/ueditor/extensions/nodes/vue/office/render.vue'
  )
  const wrapper = mount(OfficeRender, {
    props: { node: { attrs: { content: JSON.stringify(config) } } },
    global: _globalConfig,
  })
  await flushPromises()
  return wrapper
}

describe('office/render.vue', () => {
  it('vue-office 支持的格式：拉取文件后走本地渲染，不渲染 iframe', async () => {
    const wrapper = await mountOffice({ url: 'https://example.com/doc.xlsx' })
    expect(wrapper.find('.vo-excel').exists()).toBe(true)
    expect(wrapper.find('iframe').exists()).toBe(false)
  })

  it('旧格式（doc）：回退 MS Office 在线嵌入 iframe', async () => {
    const wrapper = await mountOffice({ url: 'https://example.com/doc.doc', height: 600 })
    const iframe = wrapper.find('iframe')
    expect(iframe.exists()).toBe(true)
    expect(iframe.attributes('src')).toContain('view.officeapps.live.com/embed')
    expect(iframe.attributes('src')).toContain(encodeURIComponent('https://example.com/doc.doc'))
  })

  it('无 url 时不渲染任何预览', async () => {
    const wrapper = await mountOffice({})
    expect(wrapper.find('iframe').exists()).toBe(false)
    expect(wrapper.find('.vo-excel').exists()).toBe(false)
  })

  it('旧格式的 iframe 高度取自 config.height', async () => {
    const wrapper = await mountOffice({ url: 'https://example.com/doc.ppt', height: 800 })
    const preview = wrapper.find('.office-render-preview')
    expect(preview.exists()).toBe(true)
    expect(preview.attributes('style') || '').toContain('800px')
  })

  it('文件拉取失败时显示错误态，不渲染预览', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const wrapper = await mountOffice({ url: 'https://example.com/doc.xlsx' })
    expect(wrapper.find('.vo-excel').exists()).toBe(false)
    expect(wrapper.find('.office-error').exists()).toBe(true)
  })
})
