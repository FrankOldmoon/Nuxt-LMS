/**
 * ueditor/render/nodes/file-preview.vue 组件测试：按扩展名分发预览器
 * @see modules/lms/components/ueditor/render/nodes/file-preview.vue
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

// 四个 ueditor 渲染器全部 stub（office/3d 依赖较重），断言分发与入参
vi.mock('../../../../../components/ueditor/extensions/nodes/vue/office/render.vue', () => ({
  default: {
    template: '<div class="office-render-stub" :data-content="node.attrs.content" />',
    props: ['node'],
  },
}))
vi.mock('../../../../../components/ueditor/extensions/nodes/vue/3d/render.vue', () => ({
  default: {
    template: '<div class="model3d-render-stub" :data-content="node.attrs.content" />',
    props: ['node'],
  },
}))
vi.mock('../../../../../components/ueditor/render/nodes/zip-preview.vue', () => ({
  default: {
    template: '<div class="zip-preview-stub" :data-url="url" :data-name="name" />',
    props: ['url', 'name'],
  },
}))
vi.mock('../../../../../components/ueditor/render/nodes/text-preview.vue', () => ({
  default: {
    template: '<div class="text-preview-stub" :data-url="url" :data-name="name" />',
    props: ['url', 'name'],
  },
}))

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: {
    UIcon: { template: '<span class="uicon" />', props: ['name'] },
    UButton: {
      template: '<button class="ubutton" :data-to="to">{{ label }}</button>',
      props: ['to', 'target', 'icon', 'label', 'color', 'size'],
    },
  },
}

async function mountPreview(props: { url?: string, name?: string }) {
  const { default: FilePreview } = await import('../../../../../components/ueditor/render/nodes/file-preview.vue')
  return mount(FilePreview, {
    props: { url: '', name: '', ...props },
    global: _globalConfig,
  })
}

describe('ueditor/render/nodes/file-preview.vue', () => {
  it('docx → office 渲染器（假节点携带 url/name/height）', async () => {
    const wrapper = await mountPreview({ url: '/api/files/serve?pathname=7%2Fa.docx', name: 'a.docx' })
    const stub = wrapper.find('.office-render-stub')
    expect(stub.exists()).toBe(true)
    const cfg = JSON.parse(stub.attributes('data-content'))
    expect(cfg.url).toBe('/api/files/serve?pathname=7%2Fa.docx')
    expect(cfg.name).toBe('a.docx')
    expect(cfg.height).toBe(760)
  })

  it('csv/xls → office 渲染器（vue-office excel 分支）', async () => {
    const wrapper = await mountPreview({ url: '/f/scores.csv', name: 'scores.csv' })
    expect(wrapper.find('.office-render-stub').exists()).toBe(true)
  })

  it('zip → zip 预览器', async () => {
    const wrapper = await mountPreview({ url: '/f/pack.zip', name: 'pack.zip' })
    const stub = wrapper.find('.zip-preview-stub')
    expect(stub.exists()).toBe(true)
    expect(stub.attributes('data-url')).toBe('/f/pack.zip')
    expect(stub.attributes('data-name')).toBe('pack.zip')
  })

  it('代码/文本（py）→ text 预览器', async () => {
    const wrapper = await mountPreview({ url: '/f/main.py', name: 'main.py' })
    expect(wrapper.find('.text-preview-stub').exists()).toBe(true)
  })

  it('3d 模型（stl）→ 3d 渲染器', async () => {
    const wrapper = await mountPreview({ url: '/f/car.stl', name: 'car.stl' })
    expect(wrapper.find('.model3d-render-stub').exists()).toBe(true)
  })

  it('图片 → 原生 img', async () => {
    const wrapper = await mountPreview({ url: '/f/pic.png', name: 'pic.png' })
    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('/f/pic.png')
  })

  it('视频 → 原生 video 播放器', async () => {
    const wrapper = await mountPreview({ url: '/f/demo.mp4', name: 'demo.mp4' })
    const video = wrapper.find('video')
    expect(video.exists()).toBe(true)
    expect(video.attributes('src')).toBe('/f/demo.mp4')
  })

  it('pdf → 原生 iframe 预览', async () => {
    const wrapper = await mountPreview({ url: '/api/files/serve?pathname=7%2Fa.pdf', name: 'a.pdf' })
    const iframe = wrapper.find('iframe')
    expect(iframe.exists()).toBe(true)
    expect(iframe.attributes('src')).toBe('/api/files/serve?pathname=7%2Fa.pdf')
  })

  it('无法在线预览的类型（rar）→ 仅下载', async () => {
    const wrapper = await mountPreview({ url: '/f/big.rar', name: 'big.rar' })
    expect(wrapper.find('.office-render-stub').exists()).toBe(false)
    expect(wrapper.find('iframe').exists()).toBe(false)
    const btn = wrapper.find('button.ubutton')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toBe('common.download')
    expect(btn.attributes('data-to')).toBe('/f/big.rar')
  })

  it('name 缺失时从 url 提取扩展名（pathname 查询参数）', async () => {
    const wrapper = await mountPreview({ url: '/api/files/serve?pathname=7%2Fa.docx' })
    expect(wrapper.find('.office-render-stub').exists()).toBe(true)
  })

  it('name 优先于 url 判定扩展名', async () => {
    // url 无扩展名信息，name 决定分发
    const wrapper = await mountPreview({ url: '/api/files/download?id=9', name: 'report.xlsx' })
    expect(wrapper.find('.office-render-stub').exists()).toBe(true)
  })
})
