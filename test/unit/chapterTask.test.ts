import { describe, it, expect } from 'vitest'
import { extractChapterTasks, SUBMITTABLE_TYPES } from '../../app/utils/chapterTask'

function heading(id: string, level: number, text: string) {
  return {
    type: 'heading',
    attrs: { id, level },
    content: [{ type: 'text', text }],
  }
}

function vueNode(type: string, cid: number) {
  return { type: 'vue', attrs: { type, content: cid } }
}

describe('SUBMITTABLE_TYPES', () => {
  it('contains question, homework, comment, quiz, race', () => {
    expect(SUBMITTABLE_TYPES).toContain('question')
    expect(SUBMITTABLE_TYPES).toContain('homework')
    expect(SUBMITTABLE_TYPES).toContain('comment')
    expect(SUBMITTABLE_TYPES).toContain('quiz')
    expect(SUBMITTABLE_TYPES).toContain('race')
  })
})

describe('extractChapterTasks', () => {
  it('returns empty result for null', () => {
    const result = extractChapterTasks(null)
    expect(result.headings).toEqual([])
    expect(result.tasksByHeading).toEqual({})
  })

  it('returns empty result for undefined', () => {
    const result = extractChapterTasks(undefined)
    expect(result.headings).toEqual([])
    expect(result.tasksByHeading).toEqual({})
  })

  it('extracts a single heading with no tasks', () => {
    const content = {
      type: 'doc',
      content: [heading('h1', 1, 'Title')],
    }
    const result = extractChapterTasks(content)
    expect(result.headings).toHaveLength(1)
    expect(result.headings[0]).toEqual({ id: 'h1', level: 1, text: 'Title' })
    expect(result.tasksByHeading.h1).toEqual([])
  })

  it('associates tasks with the preceding heading', () => {
    const content = {
      type: 'doc',
      content: [
        heading('h1', 1, 'Section 1'),
        vueNode('question', 5),
        vueNode('homework', 3),
      ],
    }
    const result = extractChapterTasks(content)
    expect(result.tasksByHeading.h1).toHaveLength(2)
    expect(result.tasksByHeading.h1[0]).toEqual({ type: 'question', cid: 5, key: 'question:5' })
    expect(result.tasksByHeading.h1[1]).toEqual({ type: 'homework', cid: 3, key: 'homework:3' })
  })

  it('separates tasks by heading', () => {
    const content = {
      type: 'doc',
      content: [
        heading('h1', 1, 'Section 1'),
        vueNode('question', 1),
        heading('h2', 2, 'Section 2'),
        vueNode('quiz', 2),
      ],
    }
    const result = extractChapterTasks(content)
    expect(result.headings).toHaveLength(2)
    expect(result.tasksByHeading.h1).toHaveLength(1)
    expect(result.tasksByHeading.h2).toHaveLength(1)
    expect(result.tasksByHeading.h1[0].cid).toBe(1)
    expect(result.tasksByHeading.h2[0].cid).toBe(2)
  })

  it('handles all submittable types', () => {
    const content = {
      type: 'doc',
      content: [
        heading('h1', 1, 'All'),
        vueNode('question', 1),
        vueNode('homework', 2),
        vueNode('comment', 3),
        vueNode('quiz', 4),
        vueNode('race', 5),
      ],
    }
    const result = extractChapterTasks(content)
    expect(result.tasksByHeading.h1).toHaveLength(5)
    expect(result.tasksByHeading.h1.map(t => t.type)).toEqual(
      ['question', 'homework', 'comment', 'quiz', 'race']
    )
  })

  it('ignores non-submittable vue nodes', () => {
    const content = {
      type: 'doc',
      content: [
        heading('h1', 1, 'Section'),
        vueNode('pdf', 1),
        vueNode('tabs', 2),
        vueNode('timer', 3),
      ],
    }
    const result = extractChapterTasks(content)
    expect(result.tasksByHeading.h1).toEqual([])
  })

  it('ignores vue nodes before any heading', () => {
    const content = {
      type: 'doc',
      content: [
        vueNode('question', 1),
        heading('h1', 1, 'Late'),
        vueNode('question', 2),
      ],
    }
    const result = extractChapterTasks(content)
    expect(result.headings).toHaveLength(1)
    expect(result.tasksByHeading.h1).toHaveLength(1)
    expect(result.tasksByHeading.h1[0].cid).toBe(2)
  })

  it('ignores vue nodes with cid 0', () => {
    const content = {
      type: 'doc',
      content: [
        heading('h1', 1, 'Section'),
        vueNode('question', 0),
        vueNode('homework', 0),
      ],
    }
    const result = extractChapterTasks(content)
    expect(result.tasksByHeading.h1).toEqual([])
  })

  it('handles vue node content as string number', () => {
    const content = {
      type: 'doc',
      content: [
        heading('h1', 1, 'Section'),
        { type: 'vue', attrs: { type: 'question', content: '7' } },
      ],
    }
    const result = extractChapterTasks(content)
    expect(result.tasksByHeading.h1).toHaveLength(1)
    expect(result.tasksByHeading.h1[0].cid).toBe(7)
  })

  it('supports data-toc-id as alternative id source', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { 'data-toc-id': 'alt', level: 1 },
          content: [{ type: 'text', text: 'Alt' }],
        },
        vueNode('question', 1),
      ],
    }
    const result = extractChapterTasks(content)
    expect(result.headings[0].id).toBe('alt')
    expect(result.tasksByHeading.alt).toHaveLength(1)
  })

  it('generates correct key format (type:cid)', () => {
    const content = {
      type: 'doc',
      content: [
        heading('h1', 1, 'S'),
        vueNode('quiz', 42),
      ],
    }
    const result = extractChapterTasks(content)
    expect(result.tasksByHeading.h1[0].key).toBe('quiz:42')
  })

  it('handles headings without id (skips them)', () => {
    const content = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'No ID' }] },
        vueNode('question', 1),
        heading('h1', 1, 'Has ID'),
        vueNode('question', 2),
      ],
    }
    const result = extractChapterTasks(content)
    expect(result.headings).toHaveLength(1)
    expect(result.headings[0].id).toBe('h1')
    expect(result.tasksByHeading.h1).toHaveLength(1)
    expect(result.tasksByHeading.h1[0].cid).toBe(2)
  })

  it('handles multiple headings with same id', () => {
    const content = {
      type: 'doc',
      content: [
        heading('dup', 1, 'First'),
        vueNode('question', 1),
        heading('dup', 1, 'Second'),
        vueNode('question', 2),
      ],
    }
    const result = extractChapterTasks(content)
    expect(result.headings).toHaveLength(2)
    expect(result.tasksByHeading.dup).toHaveLength(2)
  })

  it('extracts text from nested inline content', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { id: 'h1', level: 1 },
          content: [
            { type: 'text', text: 'A ' },
            { type: 'text', text: 'B' },
          ],
        },
      ],
    }
    const result = extractChapterTasks(content)
    expect(result.headings[0].text).toBe('A B')
  })
})
