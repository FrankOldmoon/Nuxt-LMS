/**
 * useChapterTask composable 测试
 * @see modules/lms/composables/useChapterTask.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  resetAllStubs,
  setMockI18n,
  setMockLayoutState,
  setMockAuthUser,
  setMockFetchHandler,
} from '../../../../test/setup/nuxt-stubs'
import { ref } from 'vue'

beforeEach(async () => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
  setMockLayoutState({ notifyCourseNavUpdate: vi.fn() })
  setMockAuthUser({ id: 1, name: 'stu' })
  setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
  // useChapterTask 依赖 auto-import 的 extractChapterTasks
  const { extractChapterTasks } = await import('../../utils/chapterTask')
  ;(globalThis as any).extractChapterTasks = extractChapterTasks
})

function makeContent(headings: any[] = [], blocks: any[] = []) {
  return {
    type: 'doc',
    content: [
      ...headings,
      ...blocks,
    ],
  }
}

describe('composables/useChapterTask', () => {
  it('初始状态：空内容时 taskMap.headings 为空', async () => {
    const { setupChapterTask, useChapterTask } = await import('../../composables/useChapterTask')
    const content = ref(null)
    const ctx = setupChapterTask({
      content,
      chapterId: ref(1),
      courseId: ref(1),
    })
    expect(ctx.taskMap.value.headings).toEqual([])
    expect(ctx.isPass.value).toBe(false)
    // useChapterTask 注入
    expect(useChapterTask()).toBe(ctx)
  })

  it('从 content 提取 headings', async () => {
    const { setupChapterTask } = await import('../../composables/useChapterTask')
    const content = ref(makeContent([
      { type: 'heading', attrs: { id: 'h1', level: 2 }, content: [{ type: 'text', text: 'Heading 1' }] },
      { type: 'heading', attrs: { id: 'h2', level: 2 }, content: [{ type: 'text', text: 'Heading 2' }] },
    ]))
    const ctx = setupChapterTask({
      content,
      chapterId: ref(1),
      courseId: ref(1),
    })
    expect(ctx.taskMap.value.headings.length).toBe(2)
    expect(ctx.taskMap.value.headings[0]?.id).toBe('h1')
  })

  it('chapterTitle 作为第一个 heading 加入', async () => {
    const { setupChapterTask } = await import('../../composables/useChapterTask')
    const content = ref(makeContent([
      { type: 'heading', attrs: { id: 'h1', level: 2 }, content: [{ type: 'text', text: 'Sub' }] },
    ]))
    const ctx = setupChapterTask({
      content,
      chapterId: ref(5),
      courseId: ref(1),
      chapterTitle: ref('Chapter Title'),
    })
    expect(ctx.taskMap.value.headings[0]?.id).toBe('5')
    expect(ctx.taskMap.value.headings[0]?.text).toBe('Chapter Title')
    expect(ctx.taskMap.value.headings[0]?.level).toBe(1)
  })

  it('reportNodeDone 标记 node 完成', async () => {
    const { setupChapterTask } = await import('../../composables/useChapterTask')
    const content = ref(makeContent(
      [{ type: 'heading', attrs: { id: 'h1', level: 2 }, content: [{ type: 'text', text: 'H1' }] }],
      [{ type: 'vue', attrs: { type: 'question', content: 100 } }],
    ))
    const ctx = setupChapterTask({
      content,
      chapterId: ref(1),
      courseId: ref(1),
    })
    ctx.reportNodeDone('question', 100, true)
    expect(ctx.nodeStatus.value['question:100']).toBe(true)
  })

  it('reportNodeDone 标记完所有任务后 heading 完成（无阅读块时）', async () => {
    const { setupChapterTask } = await import('../../composables/useChapterTask')
    const content = ref(makeContent(
      [{ type: 'heading', attrs: { id: 'h1', level: 2 }, content: [{ type: 'text', text: 'H1' }] }],
      [{ type: 'vue', attrs: { type: 'question', content: 100 } }],
    ))
    const ctx = setupChapterTask({
      content,
      chapterId: ref(1),
      courseId: ref(1),
    })
    ctx.reportNodeDone('question', 100, true)
    // 无阅读块 → 立即完成
    expect(ctx.isHeadingDone('h1')).toBe(true)
  })

  it('markBlockRead 标记块已读', async () => {
    const { setupChapterTask } = await import('../../composables/useChapterTask')
    const content = ref(makeContent(
      [{ type: 'heading', attrs: { id: 'h1', level: 2 }, content: [{ type: 'text', text: 'H1' }] }],
      [{ type: 'paragraph', content: [{ type: 'text', text: 'para' }] }],
    ))
    const ctx = setupChapterTask({
      content,
      chapterId: ref(1),
      courseId: ref(1),
    })
    expect(ctx.isBlockRead('1')).toBe(false)
    ctx.markBlockRead('1')
    expect(ctx.isBlockRead('1')).toBe(true)
  })

  it('blockHeadingOf 返回块所属 heading', async () => {
    const { setupChapterTask } = await import('../../composables/useChapterTask')
    const content = ref(makeContent(
      [{ type: 'heading', attrs: { id: 'h1', level: 2 }, content: [{ type: 'text', text: 'H1' }] }],
      [{ type: 'paragraph', content: [{ type: 'text', text: 'para' }] }],
    ))
    const ctx = setupChapterTask({
      content,
      chapterId: ref(1),
      courseId: ref(1),
    })
    expect(ctx.blockHeadingOf('1')).toBe('h1')
    expect(ctx.blockHeadingOf('unknown')).toBe(null)
  })

  it('未登录时 markBlockRead 不生效', async () => {
    setMockAuthUser(null as any)
    const { setupChapterTask } = await import('../../composables/useChapterTask')
    const content = ref(makeContent(
      [{ type: 'heading', attrs: { id: 'h1', level: 2 }, content: [{ type: 'text', text: 'H1' }] }],
      [{ type: 'paragraph', content: [{ type: 'text', text: 'para' }] }],
    ))
    const ctx = setupChapterTask({
      content,
      chapterId: ref(1),
      courseId: ref(1),
    })
    ctx.markBlockRead('1')
    expect(ctx.isBlockRead('1')).toBe(false)
  })

  it('所有 heading 完成时 isPass=true', async () => {
    const { setupChapterTask } = await import('../../composables/useChapterTask')
    const content = ref(makeContent(
      [{ type: 'heading', attrs: { id: 'h1', level: 2 }, content: [{ type: 'text', text: 'H1' }] }],
      [{ type: 'vue', attrs: { type: 'question', content: 100 } }],
    ))
    const ctx = setupChapterTask({
      content,
      chapterId: ref(1),
      courseId: ref(1),
    })
    ctx.reportNodeDone('question', 100, true)
    expect(ctx.isPass.value).toBe(true)
  })

  it('sticky：已完成的 heading 不回退', async () => {
    const { setupChapterTask } = await import('../../composables/useChapterTask')
    const content = ref(makeContent(
      [{ type: 'heading', attrs: { id: 'h1', level: 2 }, content: [{ type: 'text', text: 'H1' }] }],
      [{ type: 'vue', attrs: { type: 'question', content: 100 } }],
    ))
    const ctx = setupChapterTask({
      content,
      chapterId: ref(1),
      courseId: ref(1),
    })
    ctx.reportNodeDone('question', 100, true)
    expect(ctx.isHeadingDone('h1')).toBe(true)
    // 取消完成状态
    ctx.reportNodeDone('question', 100, false)
    // sticky：不回退
    expect(ctx.isHeadingDone('h1')).toBe(true)
  })

  it('空段落不纳入阅读追踪', async () => {
    const { setupChapterTask } = await import('../../composables/useChapterTask')
    const content = ref(makeContent(
      [{ type: 'heading', attrs: { id: 'h1', level: 2 }, content: [{ type: 'text', text: 'H1' }] }],
      [
        { type: 'paragraph', content: [] }, // 空段落（index 1）
        { type: 'paragraph', content: [{ type: 'hardBreak' }] }, // 仅 hardBreak（index 2）
      ],
    ))
    const ctx = setupChapterTask({
      content,
      chapterId: ref(1),
      courseId: ref(1),
    })
    // 空段落被 isEmptyParagraph 过滤 → blockHeadingOf 返回 null（未纳入追踪）
    expect(ctx.blockHeadingOf('1')).toBe(null)
    expect(ctx.blockHeadingOf('2')).toBe(null)
    // isBlockRead 对未追踪块返回 false
    expect(ctx.isBlockRead('1')).toBe(false)
  })

  it('列表项作为单独块追踪', async () => {
    const { setupChapterTask } = await import('../../composables/useChapterTask')
    const content = ref(makeContent(
      [{ type: 'heading', attrs: { id: 'h1', level: 2 }, content: [{ type: 'text', text: 'H1' }] }],
      [
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'b' }] }] },
          ],
        },
      ],
    ))
    const ctx = setupChapterTask({
      content,
      chapterId: ref(1),
      courseId: ref(1),
    })
    // 列表第 0 项 key 为 "1.0"，第 1 项 key 为 "1.1"（topIndex=1）
    expect(ctx.blockHeadingOf('1.0')).toBe('h1')
    expect(ctx.blockHeadingOf('1.1')).toBe('h1')
    ctx.markBlockRead('1.0')
    expect(ctx.isBlockRead('1.0')).toBe(true)
    expect(ctx.isBlockRead('1.1')).toBe(false)
  })

  it('initialTaskStatus 初始化已完成 heading', async () => {
    const { setupChapterTask } = await import('../../composables/useChapterTask')
    const content = ref(makeContent(
      [{ type: 'heading', attrs: { id: 'h1', level: 2 }, content: [{ type: 'text', text: 'H1' }] }],
    ))
    const ctx = setupChapterTask({
      content,
      chapterId: ref(1),
      courseId: ref(1),
      initialTaskStatus: { h1: true },
    })
    expect(ctx.isHeadingDone('h1')).toBe(true)
  })

  it('readingBlock 完成 heading 后触发 useUserCard().refresh() 通知 userCard 刷新', async () => {
    vi.useFakeTimers()
    const { setupChapterTask } = await import('../../composables/useChapterTask')
    const { getUserCardRefreshCount, clearUserCardRefreshCount } = await import('../../../../test/setup/nuxt-stubs')
    clearUserCardRefreshCount()
    const content = ref(makeContent(
      [{ type: 'heading', attrs: { id: 'h1', level: 2 }, content: [{ type: 'text', text: 'H1' }] }],
      [{ type: 'paragraph', content: [{ type: 'text', text: 'only block' }] }],
    ))
    const ctx = setupChapterTask({
      content,
      chapterId: ref(1),
      courseId: ref(1),
    })
    expect(getUserCardRefreshCount()).toBe(0)
    ctx.markBlockRead('1')
    // markBlockRead 内部 setTimeout 延迟 1s 才真正置 heading 完成
    expect(ctx.isHeadingDone('h1')).toBe(false)
    expect(getUserCardRefreshCount()).toBe(0)
    vi.advanceTimersByTime(1000)
    // heading 已完成 + refresh 已调用
    expect(ctx.isHeadingDone('h1')).toBe(true)
    expect(getUserCardRefreshCount()).toBe(1)
    vi.useRealTimers()
  })
})
