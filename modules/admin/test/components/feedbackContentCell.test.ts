/**
 * FeedbackContentCell 组件测试
 * @see modules/admin/overrides/FeedbackContentCell.vue
 *
 * 回归覆盖（2026-10-09）：
 * - content.text 为空时曾渲染 <img src=""> → 表格里出现破图图标
 * - 点击缩略图曾 window.open 新标签页；现改为向上抛 view 事件打开该行详情
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UIcon: { template: '<i class="icon-stub" />' },
}

const _globalConfig = { stubs: _globalStubs }

async function mountCell(row: Record<string, any>) {
  const { default: Cell } = await import('../../overrides/FeedbackContentCell.vue')
  return mount(Cell, {
    props: { row, value: row.content, fkLabel: undefined },
    global: _globalConfig,
  })
}

describe('admin/overrides/FeedbackContentCell.vue', () => {
  it('content.text 为空串时不渲染 <img>，显示占位 "-"', async () => {
    const wrapper = await mountCell({ id: 1, content: { text: '' } })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toBe('-')
  })

  it('content 为 null 时不渲染 <img>', async () => {
    const wrapper = await mountCell({ id: 1, content: null })
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('有合法 data URL 时渲染缩略图', async () => {
    const wrapper = await mountCell({ id: 1, content: { text: 'data:image/webp;base64,UklGRg==' } })
    expect(wrapper.find('img').attributes('src')).toBe('data:image/webp;base64,UklGRg==')
  })

  it('纯 base64（无 data URL 前缀）补全为 webp data URL', async () => {
    const wrapper = await mountCell({ id: 1, content: { text: 'UklGRg==' } })
    expect(wrapper.find('img').attributes('src')).toBe('data:image/webp;base64,UklGRg==')
  })

  it('点击缩略图向上抛 view 事件，而不是 window.open', async () => {
    const openSpy = vi.spyOn(globalThis.window, 'open').mockImplementation(() => null)
    const row = { id: 7, content: { text: 'data:image/webp;base64,UklGRg==' } }
    const wrapper = await mountCell(row)
    await wrapper.find('button').trigger('click')

    expect(openSpy).not.toHaveBeenCalled()
    expect(wrapper.emitted('view')).toBeTruthy()
    expect(wrapper.emitted('view')![0]).toEqual([row])
    openSpy.mockRestore()
  })
})
