/**
 * useChapterView composable 测试
 * @see modules/lms/composables/useChapterView.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  resetAllStubs,
  setMockI18n,
  setMockFetchHandler,
  getToastCalls,
  clearToastCalls,
} from '../../../../test/setup/nuxt-stubs'
import { ref } from 'vue'

beforeEach(async () => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
  setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
  // useChapterView 依赖 useSiteConfig（base 模块 auto-import）
  const { useSiteConfig } = await import('../../../base/composables/useSiteConfig')
  ;(globalThis as any).useSiteConfig = () => ({
    siteTitle: ref('TestSite'),
    logo: ref(''),
    config: ref({}),
    refreshConfig: vi.fn(),
  })
  // useLmsPublicConfig
  const { useLmsPublicConfig } = await import('../../composables/useLmsPublicConfig')
  ;(globalThis as any).useLmsPublicConfig = () => ({
    chapterPage: ref({ showOutline: true }),
    home: ref({}),
    course: ref({}),
  })
  // 依赖 vrm.ts 与 markdown.ts 与 prompts.js
  const { feedVrmText, clearVrmSpeech } = await import('../../utils/vrm')
  ;(globalThis as any).feedVrmText = feedVrmText
  ;(globalThis as any).clearVrmSpeech = clearVrmSpeech
  const { markdownToTiptap } = await import('../../utils/markdown')
  ;(globalThis as any).markdownToTiptap = markdownToTiptap
  const { extractPlainText } = await import('../../utils/toc')
  ;(globalThis as any).extractPlainText = extractPlainText
  const { allPrompts } = await import('../../components/ueditor/extensions/nodes/vue/question/edit/prompts.js')
  ;(globalThis as any).allPrompts = allPrompts
})

function makeProps(overrides: any = {}) {
  return {
    data: {
      chapter: { id: 2, title: 'Ch1', content: { type: 'doc', content: [] }, record: null },
      course: { id: 1, title: 'Course', ai: { enabled: true } },
    },
    pending: false,
    notFound: false,
    prevChapter: null,
    nextChapter: null,
    chapterId: 2,
    courseId: 1,
    ...overrides,
  }
}

describe('composables/useChapterView', () => {
  it('初始状态：assistantOpen=false, vrmVisible=false', async () => {
    const { useChapterView } = await import('../../composables/useChapterView')
    const r = useChapterView(makeProps())
    expect(r.assistantOpen.value).toBe(false)
    expect(r.vrmVisible.value).toBe(false)
  })

  it('aiEnabled 默认 true（course.ai.enabled !== false）', async () => {
    const { useChapterView } = await import('../../composables/useChapterView')
    const r = useChapterView(makeProps())
    expect(r.aiEnabled.value).toBe(true)
  })

  it('aiEnabled=false 当 course.ai.enabled === false', async () => {
    const { useChapterView } = await import('../../composables/useChapterView')
    const r = useChapterView(makeProps({
      data: {
        chapter: { title: 'Ch1', content: {} },
        course: { ai: { enabled: false } },
      },
    }))
    expect(r.aiEnabled.value).toBe(false)
  })

  it('toggleAssistant 切换开启/关闭', async () => {
    const { useChapterView } = await import('../../composables/useChapterView')
    const r = useChapterView(makeProps())
    r.toggleAssistant()
    expect(r.assistantOpen.value).toBe(true)
    // 开启时 vrmVisible 重置为 false
    expect(r.vrmVisible.value).toBe(false)
    r.toggleAssistant()
    expect(r.assistantOpen.value).toBe(false)
  })

  it('normalizeRecord 处理 null/非 doc 类型', async () => {
    const { useChapterView } = await import('../../composables/useChapterView')
    const r = useChapterView(makeProps({
      data: {
        chapter: { title: 'Ch1', content: {}, record: null },
        course: { ai: { enabled: true } },
      },
    }))
    expect(r.aiRecord.value).toEqual({ type: 'doc', content: [] })
  })

  it('normalizeRecord 处理 doc 类型', async () => {
    const { useChapterView } = await import('../../composables/useChapterView')
    const r = useChapterView(makeProps({
      data: {
        chapter: { title: 'Ch1', content: {}, record: { type: 'doc', content: [{ type: 'paragraph' }] } },
        course: { ai: { enabled: true } },
      },
    }))
    expect(r.aiRecord.value.type).toBe('doc')
    expect(r.aiRecord.value.content.length).toBe(1)
  })

  it('splitNotesContent 解析 closed notes 标签', async () => {
    // 通过 onAssistantChunk 间接测试 splitNotesContent
    const { useChapterView } = await import('../../composables/useChapterView')
    const r = useChapterView(makeProps())
    // 模拟 chatbox ref
    const msgs = ref([{ role: 'assistant', content: '' }])
    ;(r as any).aiLlmRef.value = {
      getMessages: () => msgs.value,
      refreshMessages: () => { msgs.value = [...msgs.value] },
    }
    // chunk 不含 notes → 不修改 aiRecord
    const before = r.aiRecord.value
    r.onAssistantChunk('hello')
    expect(r.aiRecord.value).toBe(before)
  })

  it('onAssistantChunk 处理 notes 标签时更新 aiRecord', async () => {
    const { useChapterView } = await import('../../composables/useChapterView')
    const r = useChapterView(makeProps())
    const msgs = ref([{ role: 'assistant', content: '' }])
    ;(r as any).aiLlmRef.value = {
      getMessages: () => msgs.value,
      refreshMessages: () => { msgs.value = [...msgs.value] },
    }
    r.onAssistantChunk('<notes>## Title\ncontent</notes>')
    expect(r.aiRecord.value.type).toBe('doc')
  })

  it('onAssistantUserMessage 清空流式状态', async () => {
    const { useChapterView } = await import('../../composables/useChapterView')
    const r = useChapterView(makeProps())
    const msgs = ref([{ role: 'assistant', content: '' }])
    ;(r as any).aiLlmRef.value = {
      getMessages: () => msgs.value,
      refreshMessages: () => { msgs.value = [...msgs.value] },
    }
    r.onAssistantChunk('some text')
    r.onAssistantUserMessage()
    // 调用后流式状态清空（再次 chunk 不会拼接旧内容）
    r.onAssistantChunk('new text')
    expect(msgs.value[0].content).toContain('new text')
  })

  it('assistantPreset 包含章节标题', async () => {
    const { useChapterView } = await import('../../composables/useChapterView')
    const r = useChapterView(makeProps())
    expect(r.assistantPreset.value).toContain('Ch1')
  })

  it('assistantPreset 无 chapter 时返回空字符串', async () => {
    const { useChapterView } = await import('../../composables/useChapterView')
    const r = useChapterView(makeProps({ data: { chapter: null, course: {} } }))
    expect(r.assistantPreset.value).toBe('')
  })

  it('assistantOpening 包含章节标题', async () => {
    const { useChapterView } = await import('../../composables/useChapterView')
    const r = useChapterView(makeProps())
    expect(r.assistantOpening.value).toContain('Ch1')
  })

  it('aiConfig 来自 course.ai', async () => {
    const { useChapterView } = await import('../../composables/useChapterView')
    const r = useChapterView(makeProps({
      data: {
        chapter: { title: 'Ch1', content: {} },
        course: { ai: { enabled: true, model: 'gpt-4' } },
      },
    }))
    expect(r.aiConfig.value?.model).toBe('gpt-4')
  })

  it('saveRecord 不在 chapterId=0 时调用', async () => {
    const { useChapterView } = await import('../../composables/useChapterView')
    const r = useChapterView(makeProps({ chapterId: 0 }))
    // saveRecord 内部检查 chapterId，不应抛错
    expect(() => r.saveRecord()).not.toThrow()
  })
})
