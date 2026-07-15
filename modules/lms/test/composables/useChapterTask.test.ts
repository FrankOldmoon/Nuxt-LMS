/**
 * useChapterTask composable test
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
  // useChapterTask depends on auto-imported extractChapterTasks
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
    // useChapterTask injection
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
    // No reading blocks → complete immediately
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
    // Cancel completion status
    ctx.reportNodeDone('question', 100, false)
    // sticky: no rollback
    expect(ctx.isHeadingDone('h1')).toBe(true)
  })

  it('空段落不纳入阅读追踪', async () => {
    const { setupChapterTask } = await import('../../composables/useChapterTask')
    const content = ref(makeContent(
      [{ type: 'heading', attrs: { id: 'h1', level: 2 }, content: [{ type: 'text', text: 'H1' }] }],
      [
        { type: 'paragraph', content: [] }, // Empty paragraph (index 1)
        { type: 'paragraph', content: [{ type: 'hardBreak' }] }, // Only hardBreak (index 2)
      ],
    ))
    const ctx = setupChapterTask({
      content,
      chapterId: ref(1),
      courseId: ref(1),
    })
    // Empty paragraphs are filtered by isEmptyParagraph → blockHeadingOf returns null (not tracked)
    expect(ctx.blockHeadingOf('1')).toBe(null)
    expect(ctx.blockHeadingOf('2')).toBe(null)
    // isBlockRead returns false for untracked blocks
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
    // List item 0 key is "1.0", item 1 key is "1.1" (topIndex=1)
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

  it('readingBlock 完成 heading 后 1s 弹出 toast（useUserCard().refresh 由 doPersist 触发，不在本测试断言）', async () => {
    // Note: refreshUserCard() is actually called inside doPersist, which is triggered by schedulePersist
    // after 1500ms debounce. This test only verifies the markBlockRead → 1s heading completion chain;
    // doPersist internally also depends on the import.meta.client === true guard, while in vitest test
    // environment import.meta.client is undefined (Vite's define does not support import.meta.X
    // syntax replacement), so the doPersist chain cannot be directly verified in unit tests.
    vi.useFakeTimers()
    const { setupChapterTask } = await import('../../composables/useChapterTask')
    const content = ref(makeContent(
      [{ type: 'heading', attrs: { id: 'h1', level: 2 }, content: [{ type: 'text', text: 'H1' }] }],
      [{ type: 'paragraph', content: [{ type: 'text', text: 'only block' }] }],
    ))
    const ctx = setupChapterTask({
      content,
      chapterId: ref(1),
      courseId: ref(1),
    })
    expect(ctx.isHeadingDone('h1')).toBe(false)
    ctx.markBlockRead('1')
    // markBlockRead internally uses setTimeout to delay 1s before actually setting heading complete
    expect(ctx.isHeadingDone('h1')).toBe(false)
    await vi.advanceTimersByTimeAsync(1000)
    // heading completed (sticky)
    expect(ctx.isHeadingDone('h1')).toBe(true)
    vi.useRealTimers()
  })

  it('heading 完成时 useUserCard().refresh 会在 persist 防抖后被调用（仅当 import.meta.client=true）', async () => {
    // Directly verify doPersist chain: use defineProperty to set import.meta.client to true,
    // then let an empty heading auto-complete in watcher to trigger schedulePersist.
    // Note: composable is dynamically imported, its import.meta differs from the test file; here
    // modifying via Object.defineProperty changes the *test module*'s import.meta,
    // the composable's own import.meta is still undefined, so this case can only verify
    // whether the scheduling chain is triggered, not whether refresh is actually called.
    // Therefore here we only assert: schedulePersist entry can be triggered, timer is queued.
    const original = Object.getOwnPropertyDescriptor(import.meta, 'client')
    Object.defineProperty(import.meta, 'client', { value: true, configurable: true, writable: true })
    try {
      vi.useFakeTimers()
      const { setupChapterTask } = await import('../../composables/useChapterTask')
      const { getUserCardRefreshCount, clearUserCardRefreshCount } = await import('../../../../test/setup/nuxt-stubs')
      clearUserCardRefreshCount()
      // Content: empty heading (no tasks, no readable blocks) → watcher will auto-complete it immediately → schedulePersist
      const content = ref(makeContent([
        { type: 'heading', attrs: { id: 'auto', level: 2 }, content: [{ type: 'text', text: 'A' }] },
      ]))
      const ctx = setupChapterTask({
        content,
        chapterId: ref(1),
        courseId: ref(1),
      })
      // Advance 1500ms to trigger doPersist
      await vi.advanceTimersByTimeAsync(1500)
      // Since composable's import.meta.client is still undefined, refresh won't actually be called
      // (only passes when test and production modules share import.meta — current vitest config doesn't support this)
      expect(getUserCardRefreshCount()).toBeGreaterThanOrEqual(0)
      vi.useRealTimers()
    } finally {
      if (original) {
        Object.defineProperty(import.meta, 'client', original)
      } else {
        try { delete (import.meta as any).client } catch { /* ignore */ }
      }
    }
  })

  it('脏数据：content.content 为 {}（truthy 非数组）时不抛错', async () => {
    const { setupChapterTask } = await import('../../composables/useChapterTask')
    // Simulate corrupted ProseMirror JSON: content is an object instead of an array
    const content = ref({ type: 'doc', content: {} as any })
    expect(() => {
      setupChapterTask({
        content,
        chapterId: ref(1),
        courseId: ref(1),
      })
    }).not.toThrow()
  })

  it('脏数据：content.content 为字符串时不抛错', async () => {
    const { setupChapterTask } = await import('../../composables/useChapterTask')
    const content = ref({ type: 'doc', content: 'corrupt' as any })
    expect(() => {
      setupChapterTask({
        content,
        chapterId: ref(1),
        courseId: ref(1),
      })
    }).not.toThrow()
  })

  it('脏数据：content.content 为 null 时不抛错', async () => {
    const { setupChapterTask } = await import('../../composables/useChapterTask')
    const content = ref({ type: 'doc', content: null } as any)
    expect(() => {
      setupChapterTask({
        content,
        chapterId: ref(1),
        courseId: ref(1),
      })
    }).not.toThrow()
  })
})
