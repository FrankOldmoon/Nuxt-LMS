// ueditor/contentPicker.vue — 「挂载即已打开」的取数回归测试
// @see modules/lms/components/ueditor/contentPicker/useContentPicker.ts
//
// 回归背景：/api/courses/content 的拉取挂在 watch(open) 上。侧边栏用
// <LazyUeditorContentPicker v-if="contentPickerOpen" v-model="contentPickerOpen" /> 挂载，
// 组件被创建时 modelValue 已经等于 true —— watch 只在「变化」时触发，初始值不触发，
// 于是 fetchItems() 永不执行，弹窗只显示 "No content"。
//
// 因此这里用 modelValue: true 挂载（模拟 v-if 门控的创建时刻），断言确实发起了请求。
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import {
  resetAllStubs,
  setMockI18n,
  setMockLmsContext,
  setMockFetchHandler,
  setMockRuntimeConfig,
} from '../../../../../test/setup/nuxt-stubs'

const _globalConfig = {
  mocks: { $t: (k: string) => k, $i18n: { t: (k: string) => k, locale: { value: 'en' } } },
  stubs: {
    UModal: { template: '<div><slot name="content" /></div>' },
    ContentPickerHeader: true,
    ContentPickerPreviewArea: true,
    ContentPickerFooter: true,
    ContentPickerImportModal: true,
    QuestionEdit: true,
    HomeworkEdit: true,
    CommentEdit: true,
    QuizEdit: true,
    RaceEdit: true,
  },
}

describe('ueditor/contentPicker.vue — 打开时取数', () => {
  beforeEach(() => {
    resetAllStubs()
    setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
    setMockLmsContext(5, 0)
    setMockRuntimeConfig({ public: { moduleBase: true, moduleLms: false } })
  })

  it('以 modelValue=true 挂载（v-if 门控场景）时应立即拉取 /api/courses/content', async () => {
    const calls: string[] = []
    setMockFetchHandler(async (url: string) => {
      calls.push(url)
      if (url.startsWith('/api/courses/content')) {
        return { data: [{ type: 'question', cid: 1, name: 'Q1' }], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })

    const { default: ContentPicker } = await import('../../../components/ueditor/contentPicker.vue')
    mount(ContentPicker, {
      props: { modelValue: true, previewMode: true },
      global: _globalConfig,
    })
    await flushPromises()

    expect(calls.some((u) => u.includes('/api/courses/content'))).toBe(true)
  })
})
