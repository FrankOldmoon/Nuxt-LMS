/**
 * 章节任务提取工具测试
 * @see modules/lms/utils/chapterTask.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

describe('utils/chapterTask - SUBMITTABLE_TYPES', () => {
  it('包含 question / homework / comment / quiz / race', async () => {
    const { SUBMITTABLE_TYPES } = await import('../../utils/chapterTask')
    expect(SUBMITTABLE_TYPES).toContain('question')
    expect(SUBMITTABLE_TYPES).toContain('homework')
    expect(SUBMITTABLE_TYPES).toContain('comment')
    expect(SUBMITTABLE_TYPES).toContain('quiz')
    expect(SUBMITTABLE_TYPES).toContain('race')
  })
})

describe('utils/chapterTask - extractChapterTasks', () => {
  it('空内容返回空 headings 和空 tasks', async () => {
    const { extractChapterTasks } = await import('../../utils/chapterTask')
    expect(extractChapterTasks(null)).toEqual({ headings: [], tasksByHeading: {} })
    expect(extractChapterTasks(undefined)).toEqual({ headings: [], tasksByHeading: {} })
  })

  it('从 heading 节点提取 level / id / text', async () => {
    const { extractChapterTasks } = await import('../../utils/chapterTask')
    const content = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { id: 'h1', level: 1 },
          content: [{ type: 'text', text: '第一章' }],
        },
        {
          type: 'heading',
          attrs: { id: 'h2', level: 2 },
          content: [{ type: 'text', text: '小节' }],
        },
      ],
    }
    const result = extractChapterTasks(content as any)
    expect(result.headings).toHaveLength(2)
    expect(result.headings[0]).toMatchObject({ id: 'h1', level: 1, text: '第一章' })
    expect(result.headings[1]).toMatchObject({ id: 'h2', level: 2, text: '小节' })
  })

  it('提取 vue 节点的可提交任务（question / homework 等）', async () => {
    const { extractChapterTasks } = await import('../../utils/chapterTask')
    const content = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { id: 'h1', level: 1 },
          content: [{ type: 'text', text: '章名' }],
        },
        {
          type: 'vue',
          attrs: { type: 'question', content: '101' },
        },
        {
          type: 'vue',
          attrs: { type: 'homework', content: '202' },
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '正文' }],
        },
      ],
    }
    const result = extractChapterTasks(content as any)
    expect(result.tasksByHeading['h1']).toHaveLength(2)
    expect(result.tasksByHeading['h1'][0]).toMatchObject({ type: 'question', cid: 101, key: 'question:101' })
    expect(result.tasksByHeading['h1'][1]).toMatchObject({ type: 'homework', cid: 202, key: 'homework:202' })
  })

  it('纯文字 heading（无 task）对应空 tasks 数组', async () => {
    const { extractChapterTasks } = await import('../../utils/chapterTask')
    const content = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { id: 'h1', level: 1 },
          content: [{ type: 'text', text: '标题' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '段落' }],
        },
      ],
    }
    const result = extractChapterTasks(content as any)
    expect(result.tasksByHeading['h1']).toEqual([])
  })

  it('不支持的 vue type 不会进入 tasks', async () => {
    const { extractChapterTasks } = await import('../../utils/chapterTask')
    const content = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { id: 'h1', level: 1 },
          content: [{ type: 'text', text: '标题' }],
        },
        {
          type: 'vue',
          attrs: { type: 'image', content: 'xxx' }, // 非可提交类型
        },
      ],
    }
    const result = extractChapterTasks(content as any)
    expect(result.tasksByHeading['h1']).toEqual([])
  })

  it('递归处理嵌套 content（嵌套 blockquote）', async () => {
    const { extractChapterTasks } = await import('../../utils/chapterTask')
    const content = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { id: 'h1', level: 1 },
          content: [{ type: 'text', text: 'H' }],
        },
        {
          type: 'blockquote',
          content: [
            {
              type: 'vue',
              attrs: { type: 'comment', content: '999' },
            },
          ],
        },
      ],
    }
    const result = extractChapterTasks(content as any)
    expect(result.tasksByHeading['h1']).toHaveLength(1)
    expect(result.tasksByHeading['h1'][0]).toMatchObject({ type: 'comment', cid: 999 })
  })

  it('无 id 的 heading 被忽略', async () => {
    const { extractChapterTasks } = await import('../../utils/chapterTask')
    const content = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 }, // 无 id
          content: [{ type: 'text', text: '无 id 标题' }],
        },
      ],
    }
    const result = extractChapterTasks(content as any)
    expect(result.headings).toHaveLength(0)
  })

  it('空 content 的 node 安全处理', async () => {
    const { extractChapterTasks } = await import('../../utils/chapterTask')
    const content = {
      type: 'doc',
      content: [
        null,
        { type: 'paragraph' },
        { type: 'heading', attrs: { id: 'h1', level: 1 }, content: [] },
      ],
    }
    const result = extractChapterTasks(content as any)
    expect(result.headings).toHaveLength(1)
  })
})
