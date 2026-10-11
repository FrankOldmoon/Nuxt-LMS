/**
 * FeedbackModal 组件测试（管理员视图）
 * @see modules/base/components/layout/feedbackModal.vue
 *
 * 回归覆盖（2026-10-09 线上反馈）：
 * 1. 无图反馈渲染 <img src=""> → 浏览器显示破图图标；应改为占位图标，不渲染 img
 * 2. 列表行不显示用户 username（只有显示名），同名学生无法区分
 * 3. 点击行 window.open 图片，没有「详情」概念
 * 4. 分页固定 pageSize=10，无法调整每页条数
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n, setMockAuthUser, setMockFetchHandler } from '../../../../../test/setup/nuxt-stubs'

/** 抓取 cRequest 发出的 URL，便于断言分页参数 */
let _urls: string[] = []

/** 与线上真实数据同构：content.text 为空串（旧反馈确实没存图） */
function makeRow(overrides: Record<string, any> = {}) {
  return {
    id: 4,
    name: '但还是感觉阿萨v给介绍个帅哥v法撒旦一块',
    type: 'suggestion',
    content: { text: '' },
    userId: 500,
    userName: 'Lucas(賴錦瀚)',
    username: '20246480',
    createdAt: '2026-09-30T05:59:34.008Z',
    ...overrides,
  }
}

beforeEach(() => {
  resetAllStubs()
  _urls = []
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  setMockAuthUser({ id: 1, name: 'Admin' }, [{ code: 'admin' }], [])
  setMockFetchHandler(async (url: string) => {
    _urls.push(String(url))
    return {
      data: { data: [makeRow()], total: 1 },
      success: true,
      msg: '',
    }
  })
  ;(globalThis as any).useAuth = () => ({ hasRole: (r: string) => r === 'admin' })
  ;(globalThis as any).useToast = () => ({ add: vi.fn() })
})

const _globalStubs = {
  UModal: {
    template: '<div v-if="open" class="modal"><slot name="content" /></div>',
    props: ['open', 'ui'],
  },
  UButton: { template: '<button><slot /></button>' },
  UIcon: { template: '<i class="icon-stub" />' },
  UBadge: { template: '<span class="badge"><slot /></span>' },
  UFormField: { template: '<div><slot /></div>' },
  UTextarea: { template: '<textarea />' },
  USelect: {
    props: ['modelValue', 'items', 'valueKey'],
    template:
      '<select class="select-stub" :value="modelValue" @change="$emit(\'update:modelValue\', Number($event.target.value))">'
      + '<option v-for="it in items" :key="it.value" :value="it.value">{{ it.label }}</option>'
      + '</select>',
  },
  UPagination: {
    props: ['page', 'total', 'itemsPerPage'],
    template: '<div class="pagination-stub" />',
  },
}

const _globalConfig = {
  mocks: {
    $t: (k: string) => k,
    $i18n: { t: (k: string) => k, locale: { value: 'en' } },
  },
  stubs: _globalStubs,
}

async function mountAdmin() {
  const { default: FeedbackModal } = await import('../../../components/layout/feedbackModal.vue')
  const wrapper = mount(FeedbackModal, { props: { open: true }, global: _globalConfig })
  await flushPromises()
  return wrapper
}

describe('layout/feedbackModal.vue 管理员视图', () => {
  it('无图反馈不渲染 <img>（避免 src="" 破图）', async () => {
    const wrapper = await mountAdmin()
    expect(wrapper.findAll('img')).toHaveLength(0)
  })

  it('有图反馈渲染 <img> 且 src 为合法 data URL', async () => {
    setMockFetchHandler(async () => ({
      data: { data: [makeRow({ content: { text: 'data:image/webp;base64,UklGRg==' } })], total: 1 },
      success: true,
      msg: '',
    }))
    const wrapper = await mountAdmin()
    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('data:image/webp;base64,UklGRg==')
  })

  it('列表行同时显示显示名与 username', async () => {
    const wrapper = await mountAdmin()
    expect(wrapper.text()).toContain('Lucas(賴錦瀚)')
    expect(wrapper.text()).toContain('20246480')
  })

  it('点击行打开详情弹窗（不再直接 window.open）', async () => {
    // 用 spyOn 而不是替换 globalThis.window：整体替换会破坏 jsdom 的事件构造器，
    // 导致后续 trigger/setValue 报 "SupportedEventInterface is not a constructor"
    const openSpy = vi.spyOn(globalThis.window, 'open').mockImplementation(() => null)
    const wrapper = await mountAdmin()
    expect(wrapper.text()).not.toContain('feedback.detail')

    await wrapper.find('.cursor-pointer').trigger('click')
    await flushPromises()
    expect(openSpy).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('feedback.detail')
    expect(wrapper.text()).toContain('20246480')
    openSpy.mockRestore()
  })

  it('分页提供每页条数选择，默认按 10 请求', async () => {
    const wrapper = await mountAdmin()
    expect(_urls.some(u => u.includes('pageSize=10'))).toBe(true)
    expect(wrapper.find('.select-stub').exists()).toBe(true)
    expect(wrapper.text()).toContain('feedback.rowsPerPage')
  })

  it('切换每页条数后回到第 1 页并按新值请求', async () => {
    const wrapper = await mountAdmin()
    _urls = []
    await wrapper.find('.select-stub').setValue('50')
    await flushPromises()
    expect(_urls.some(u => u.includes('pageSize=50') && u.includes('page=1'))).toBe(true)
  })
})
