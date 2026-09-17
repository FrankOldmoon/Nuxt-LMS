/**
 * ueditor/render/nodes/code-block.vue 组件测试
 * @see modules/lms/components/ueditor/render/nodes/code-block.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'
import { buildCodeflowUrl, toBase64UrlUtf8, CODEFLOW_BASE_URL } from '../../../../../components/ueditor/render/nodes/useCodeBlock'

// 系统配置中的 Python 运行器基址（模拟 useLmsPublicConfig().codeflow.url）
let _codeflowUrl = ref('')
;(globalThis as any).useLmsPublicConfig = () => ({
  codeflow: computed(() => ({ url: _codeflowUrl.value })),
})

beforeEach(() => {
  resetAllStubs()
  _codeflowUrl = ref('')
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  IdeModal: { template: '<div class="ide-modal-stub" />', props: ['open', 'code', 'language'] },
  UModal: {
    template: '<div v-if="open" class="umodal" :class="{ fullscreen }"><slot name="content" /></div>',
    props: { open: {}, ui: {}, fullscreen: { type: Boolean } },
  },
  UButton: {
    template: '<button class="ubtn" @click="$emit(\'click\')"><slot /></button>',
    props: ['icon', 'color', 'variant', 'size'],
    emits: ['click'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k, $i18n: { t: (k: string) => k, locale: { value: 'en' } } },
  stubs: _globalStubs,
}

describe('ueditor/render/nodes/code-block.vue', () => {
  it('renders code block with language label and code', async () => {
    const { default: CodeBlockView } = await import('../../../../../components/ueditor/render/nodes/code-block.vue')
    const wrapper = mount(CodeBlockView, {
      props: {
        node: {
          type: 'codeBlock',
          attrs: { language: 'javascript', theme: 'dark' },
          content: [{ type: 'text', text: 'const x = 1' }],
        },
      },
      global: _globalConfig,
    })
    expect(wrapper.find('.cb-wrapper').exists()).toBe(true)
    expect(wrapper.find('.cb-lang').text()).toBe('javascript')
    expect(wrapper.find('.cb-code').exists()).toBe(true)
  })

  it('shows run button for Python', async () => {
    const { default: CodeBlockView } = await import('../../../../../components/ueditor/render/nodes/code-block.vue')
    const wrapper = mount(CodeBlockView, {
      props: { node: { type: 'codeBlock', attrs: { language: 'python' }, content: [{ type: 'text', text: 'print(1)' }] } },
      global: _globalConfig,
    })
    expect(wrapper.find('.cb-run').exists()).toBe(true)
  })

  it('shows run button for JavaScript', async () => {
    const { default: CodeBlockView } = await import('../../../../../components/ueditor/render/nodes/code-block.vue')
    const wrapper = mount(CodeBlockView, {
      props: { node: { type: 'codeBlock', attrs: { language: 'javascript' }, content: [{ type: 'text', text: 'console.log(1)' }] } },
      global: _globalConfig,
    })
    expect(wrapper.find('.cb-run').exists()).toBe(true)
  })

  it('shows run button for C++ and Java', async () => {
    const { default: CodeBlockView } = await import('../../../../../components/ueditor/render/nodes/code-block.vue')
    const wrapper = mount(CodeBlockView, {
      props: { node: { type: 'codeBlock', attrs: { language: 'cpp' }, content: [{ type: 'text', text: 'int main(){}' }] } },
      global: _globalConfig,
    })
    expect(wrapper.find('.cb-run').exists()).toBe(true)
  })

  it('does not show run button for plaintext', async () => {
    const { default: CodeBlockView } = await import('../../../../../components/ueditor/render/nodes/code-block.vue')
    const wrapper = mount(CodeBlockView, {
      props: { node: { type: 'codeBlock', attrs: { language: 'plaintext' }, content: [{ type: 'text', text: 'hello' }] } },
      global: _globalConfig,
    })
    expect(wrapper.find('.cb-run').exists()).toBe(false)
  })

  it('defaults language to plaintext when not specified', async () => {
    const { default: CodeBlockView } = await import('../../../../../components/ueditor/render/nodes/code-block.vue')
    const wrapper = mount(CodeBlockView, {
      props: { node: { type: 'codeBlock', attrs: {}, content: [] } },
      global: _globalConfig,
    })
    expect(wrapper.find('.cb-lang').text()).toBe('plaintext')
  })

  it('高亮 html 代码（别名 html → xml 映射）', async () => {
    const { default: CodeBlockView } = await import('../../../../../components/ueditor/render/nodes/code-block.vue')
    const wrapper = mount(CodeBlockView, {
      props: {
        node: {
          type: 'codeBlock',
          attrs: { language: 'html' },
          content: [{ type: 'text', text: '<div class="box"><h1>Hi</h1></div>' }],
        },
      },
      global: _globalConfig,
    })
    const html = wrapper.find('.cb-code').html()
    expect(html).toContain('hljs-tag')
    expect(html).toContain('hljs-name')
    expect(html).toContain('hljs-attr')
    expect(html).toContain('hljs-string')
  })

  it('高亮 js 别名（js → javascript 映射）', async () => {
    const { default: CodeBlockView } = await import('../../../../../components/ueditor/render/nodes/code-block.vue')
    const wrapper = mount(CodeBlockView, {
      props: {
        node: {
          type: 'codeBlock',
          attrs: { language: 'js' },
          content: [{ type: 'text', text: 'const x = 1' }],
        },
      },
      global: _globalConfig,
    })
    expect(wrapper.find('.cb-code').html()).toContain('hljs-keyword')
  })

  it('未知语言仍转义纯文本（不抛错）', async () => {
    const { default: CodeBlockView } = await import('../../../../../components/ueditor/render/nodes/code-block.vue')
    const wrapper = mount(CodeBlockView, {
      props: {
        node: {
          type: 'codeBlock',
          attrs: { language: 'foobarbaz' },
          content: [{ type: 'text', text: '<script>alert(1)</script>' }],
        },
      },
      global: _globalConfig,
    })
    const html = wrapper.find('.cb-code').html()
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  // ── Python run 按钮 → codeflow iframe ──

  const pythonNode = {
    type: 'codeBlock',
    attrs: { language: 'python' },
    content: [{ type: 'text', text: 'print("你好")\n# 这是中文说明' }],
  }

  async function mountCodeBlock(node: any) {
    const { default: CodeBlockView } = await import('../../../../../components/ueditor/render/nodes/code-block.vue')
    return mount(CodeBlockView, { props: { node }, global: _globalConfig })
  }

  it('Python：点击运行按钮打开 codeflow iframe，不再打开内置 IDE', async () => {
    const wrapper = await mountCodeBlock(pythonNode)
    expect(wrapper.find('.cb-codeflow-frame').exists()).toBe(false)

    await wrapper.find('.cb-run').trigger('click')

    const iframe = wrapper.find('.cb-codeflow-frame')
    expect(iframe.exists()).toBe(true)
    expect(iframe.attributes('src')).toBe(buildCodeflowUrl('print("你好")\n# 这是中文说明'))
    expect(iframe.attributes('src')!.startsWith(`${CODEFLOW_BASE_URL}?code=`)).toBe(true)
    expect(iframe.attributes('src')!.endsWith('&run=1')).toBe(true)
    expect(wrapper.findComponent(_globalStubs.IdeModal).props('open')).toBe(false)
  })

  it('JavaScript：点击运行按钮仍走内置 IDE，不出现 iframe', async () => {
    const wrapper = await mountCodeBlock({
      type: 'codeBlock',
      attrs: { language: 'javascript' },
      content: [{ type: 'text', text: 'console.log(1)' }],
    })

    await wrapper.find('.cb-run').trigger('click')

    expect(wrapper.findComponent(_globalStubs.IdeModal).props('open')).toBe(true)
    expect(wrapper.find('.cb-codeflow-frame').exists()).toBe(false)
  })

  it('Python：运行弹窗为 fullscreen 铺满整屏，且工具条可关闭', async () => {
    const wrapper = await mountCodeBlock(pythonNode)
    await wrapper.find('.cb-run').trigger('click')

    const modal = wrapper.find('.umodal')
    expect(modal.exists()).toBe(true)
    expect(modal.classes()).toContain('fullscreen')

    // 顶部工具条：标题 + 关闭按钮（fullscreen 下没有可点的遮罩）
    expect(wrapper.find('.cb-codeflow-title').text()).toBe('ide.title')
    const closeBtn = wrapper.find('.cb-codeflow-bar .ubtn')
    expect(closeBtn.exists()).toBe(true)

    await closeBtn.trigger('click')
    expect(wrapper.find('.umodal').exists()).toBe(false)
    expect(wrapper.find('.cb-codeflow-frame').exists()).toBe(false)
  })

  it('Python：运行地址使用系统配置 codeflow.url', async () => {
    _codeflowUrl.value = 'https://runner.example.com/ide'
    const wrapper = await mountCodeBlock(pythonNode)
    await wrapper.find('.cb-run').trigger('click')

    const src = wrapper.find('.cb-codeflow-frame').attributes('src')!
    expect(src.startsWith('https://runner.example.com/ide?code=')).toBe(true)
    expect(src.endsWith('&run=1')).toBe(true)
  })

  it('Python：系统配置为空时回退到内置默认地址', async () => {
    _codeflowUrl.value = ''
    const wrapper = await mountCodeBlock(pythonNode)
    await wrapper.find('.cb-run').trigger('click')

    const src = wrapper.find('.cb-codeflow-frame').attributes('src')!
    expect(src.startsWith(`${CODEFLOW_BASE_URL}?code=`)).toBe(true)
  })
})

describe('codeflow 运行链接', () => {
  it('默认基址为内置地址（可被系统配置覆盖）', () => {
    expect(CODEFLOW_BASE_URL).toBe('http://10.28.1.152/ide')
    expect(buildCodeflowUrl('print(1)').startsWith(`${CODEFLOW_BASE_URL}?code=`)).toBe(true)
  })

  it('传入自定义基址时拼接该基址', () => {
    const url = new URL(buildCodeflowUrl('print(1)', 'https://runner.example.com/ide'))
    expect(`${url.origin}${url.pathname}`).toBe('https://runner.example.com/ide')
    expect(url.searchParams.get('run')).toBe('1')
  })

  it('基址已带 query 时用 & 连接（不产生第二个 ?）', () => {
    const raw = buildCodeflowUrl('print(1)', 'https://runner.example.com/ide?theme=dark')
    expect(raw.startsWith('https://runner.example.com/ide?theme=dark&code=')).toBe(true)
    expect((raw.match(/\?/g) || []).length).toBe(1)
  })

  it('基址为空时回退默认地址', () => {
    expect(buildCodeflowUrl('print(1)', '   ').startsWith(`${CODEFLOW_BASE_URL}?code=`)).toBe(true)
  })

  it('code 为 UTF-8 base64url（无 + / = ），run=1 齐全', () => {
    const code = 'print("你好")\n# 这是中文说明'
    const raw = buildCodeflowUrl(code)
    const url = new URL(raw)

    expect(`${url.origin}${url.pathname}`).toBe(CODEFLOW_BASE_URL)
    expect(url.searchParams.get('run')).toBe('1')

    // base64url：query 里不会出现会被破坏/需转义的 + / =
    const param = url.searchParams.get('code')!
    expect(param).toBe(toBase64UrlUtf8(code))
    expect(param).not.toMatch(/[+/=]/)

    // 中文按 UTF-8 编码，还原后与源码一致
    const std = param.replace(/-/g, '+').replace(/_/g, '/')
    const padded = std + '='.repeat((4 - (std.length % 4)) % 4)
    const bytes = Uint8Array.from(atob(padded), ch => ch.charCodeAt(0))
    expect(new TextDecoder().decode(bytes)).toBe(code)
  })
})
