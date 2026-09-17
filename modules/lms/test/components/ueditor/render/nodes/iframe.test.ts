/**
 * ueditor/render/nodes/iframe.vue 组件测试
 * @see modules/lms/components/ueditor/render/nodes/iframe.vue
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed, nextTick } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'
import { buildCodeflowUrl } from '../../../../../components/ueditor/render/nodes/useCodeBlock'

// iframe.vue 读取 codeflow.url（被嵌入页面点「运行」时在本页弹出运行器）
let _codeflowUrl = ref('')
;(globalThis as any).useLmsPublicConfig = () => ({
  codeflow: computed(() => ({ url: _codeflowUrl.value })),
})

beforeEach(() => {
  resetAllStubs()
  _codeflowUrl = ref('')
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalConfig = {
  mocks: { $t: (k: string) => k, $i18n: { t: (k: string) => k, locale: { value: 'en' } } },
  stubs: {
    IdeModal: {
      template: '<div v-if="open" class="ide-modal-stub" :data-portal="portal === true ? \'body\' : \'element\'" />',
      props: ['open', 'code', 'language', 'portal'],
    },
    UModal: {
      template: '<div v-if="open" class="umodal" :data-portal="portal === true ? \'body\' : \'element\'"><slot name="content" /></div>',
      props: { open: {}, ui: {}, fullscreen: { type: Boolean }, portal: {} },
    },
  },
}

describe('ueditor/render/nodes/iframe.vue', () => {
  it('renders an <iframe> with src', async () => {
    const { default: IframeView } = await import('../../../../../components/ueditor/render/nodes/iframe.vue')
    const wrapper = mount(IframeView, {
      props: { node: { type: 'iframe', attrs: { src: 'https://example.com' } } },
      global: _globalConfig,
    })
    const iframe = wrapper.find('iframe')
    expect(iframe.exists()).toBe(true)
    expect(iframe.attributes('src')).toBe('https://example.com')
  })

  it('uses default height 200px when not specified', async () => {
    const { default: IframeView } = await import('../../../../../components/ueditor/render/nodes/iframe.vue')
    const wrapper = mount(IframeView, {
      props: { node: { type: 'iframe', attrs: { src: '/page' } } },
      global: _globalConfig,
    })
    expect(wrapper.find('iframe').attributes('style') || '').toContain('height: 200px')
  })

  it('applies custom height from attrs', async () => {
    const { default: IframeView } = await import('../../../../../components/ueditor/render/nodes/iframe.vue')
    const wrapper = mount(IframeView, {
      props: { node: { type: 'iframe', attrs: { src: '/page', height: 500 } } },
      global: _globalConfig,
    })
    expect(wrapper.find('iframe').attributes('style') || '').toContain('height: 500px')
  })

  it('renders 打开网页按钮与全屏按钮', async () => {
    const { default: IframeView } = await import('../../../../../components/ueditor/render/nodes/iframe.vue')
    const wrapper = mount(IframeView, {
      props: { node: { type: 'iframe', attrs: { src: 'https://example.com/page' } } },
      global: _globalConfig,
    })
    expect(wrapper.find('.iframe-open-btn').exists()).toBe(true)
    expect(wrapper.find('.iframe-fullscreen-btn').exists()).toBe(true)
  })

  it('点击打开网页按钮在新标签页打开完整 URL', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    const { default: IframeView } = await import('../../../../../components/ueditor/render/nodes/iframe.vue')
    const wrapper = mount(IframeView, {
      props: { node: { type: 'iframe', attrs: { src: '/page' } } },
      global: _globalConfig,
    })
    await wrapper.find('.iframe-open-btn').trigger('click')
    const href = (String((window.open as any).mock.calls[0][0]))
    expect(href.endsWith('/page')).toBe(true)
    expect((window.open as any).mock.calls[0][1]).toBe('_blank')
    openSpy.mockRestore()
  })

  it('被嵌入页面发来运行请求（Python）时，在本页弹出 codeflow 运行器', async () => {
    const { default: IframeView } = await import('../../../../../components/ueditor/render/nodes/iframe.vue')
    const wrapper = mount(IframeView, {
      props: { node: { type: 'iframe', attrs: { src: '/course/1/2' } } },
      global: _globalConfig,
    })
    const frameEl = wrapper.find('iframe').element as HTMLIFrameElement
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'lms-code-run', code: 'print(1)', language: 'python' },
      source: frameEl.contentWindow as any,
    }))
    await nextTick()

    const modal = wrapper.find('.umodal')
    expect(modal.exists()).toBe(true)
    const inner = modal.find('.iframe-codeflow-frame')
    expect(inner.exists()).toBe(true)
    expect(inner.attributes('src')).toBe(buildCodeflowUrl('print(1)'))
  })

  it('被嵌入页面发来运行请求（JavaScript）时，在本页弹出内置 IDE', async () => {
    const { default: IframeView } = await import('../../../../../components/ueditor/render/nodes/iframe.vue')
    const wrapper = mount(IframeView, {
      props: { node: { type: 'iframe', attrs: { src: '/course/1/2' } } },
      global: _globalConfig,
    })
    const frameEl = wrapper.find('iframe').element as HTMLIFrameElement
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'lms-code-run', code: 'console.log(1)', language: 'javascript' },
      source: frameEl.contentWindow as any,
    }))
    await nextTick()

    expect(wrapper.find('.ide-modal-stub').exists()).toBe(true)
    expect(wrapper.find('.umodal').exists()).toBe(false)
  })

  it('忽略非本 iframe 来源的 code-run 消息', async () => {
    const { default: IframeView } = await import('../../../../../components/ueditor/render/nodes/iframe.vue')
    const wrapper = mount(IframeView, {
      props: { node: { type: 'iframe', attrs: { src: '/course/1/2' } } },
      global: _globalConfig,
    })
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'lms-code-run', code: 'print(1)', language: 'python' },
      source: window as any,
    }))
    await nextTick()

    expect(wrapper.find('.umodal').exists()).toBe(false)
  })

  it('未全屏时运行器弹窗 teleport 到 body', async () => {
    const { default: IframeView } = await import('../../../../../components/ueditor/render/nodes/iframe.vue')
    const wrapper = mount(IframeView, {
      props: { node: { type: 'iframe', attrs: { src: '/course/1/2' } } },
      global: _globalConfig,
    })
    const frameEl = wrapper.find('iframe').element as HTMLIFrameElement
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'lms-code-run', code: 'print(1)', language: 'python' },
      source: frameEl.contentWindow as any,
    }))
    await nextTick()

    expect(wrapper.find('.umodal').attributes('data-portal')).toBe('body')
  })

  it('iframe 容器全屏时运行器弹窗 teleport 到全屏元素（否则 body 级弹窗不可见）', async () => {
    const origFs = Object.getOwnPropertyDescriptor(document, 'fullscreenElement')
    const fsEl = document.createElement('div')
    document.body.appendChild(fsEl)
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fsEl })
    try {
      const { default: IframeView } = await import('../../../../../components/ueditor/render/nodes/iframe.vue')

      // Python → codeflow 弹窗
      const wrapper = mount(IframeView, {
        props: { node: { type: 'iframe', attrs: { src: '/course/1/2' } } },
        global: _globalConfig,
      })
      const frameEl = wrapper.find('iframe').element as HTMLIFrameElement
      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'lms-code-run', code: 'print(1)', language: 'python' },
        source: frameEl.contentWindow as any,
      }))
      await nextTick()
      expect(wrapper.find('.umodal').attributes('data-portal')).toBe('element')

      // JavaScript → 内置 IDE 弹窗
      const wrapper2 = mount(IframeView, {
        props: { node: { type: 'iframe', attrs: { src: '/course/1/2' } } },
        global: _globalConfig,
      })
      const frameEl2 = wrapper2.find('iframe').element as HTMLIFrameElement
      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'lms-code-run', code: 'console.log(1)', language: 'javascript' },
        source: frameEl2.contentWindow as any,
      }))
      await nextTick()
      expect(wrapper2.find('.ide-modal-stub').attributes('data-portal')).toBe('element')
    } finally {
      if (origFs) Object.defineProperty(document, 'fullscreenElement', origFs)
      else delete (document as any).fullscreenElement
      document.body.removeChild(fsEl)
    }
  })
})
