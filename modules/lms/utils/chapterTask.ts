/**
 * Chapter task extraction utility
 *
 * Extracts all headings and their following submittable task nodes
 * (question / homework / comment / quiz / race) from tiptap JSON content,
 * used to determine the completion status of each heading.
 *
 * Rules:
 * - A heading's range spans from itself to the next heading (any level)
 * - If there are no submittable tasks in the range → pure text heading, requires 5s dwell to complete
 * - If there are submittable tasks in the range → completed only when all are answered correctly / submitted
 */
import { extractText } from './tiptapText'

/** Submittable task node types (corresponding to the vue node's attrs.type) */
export const SUBMITTABLE_TYPES = ['question', 'homework', 'comment', 'quiz', 'race'] as const

export interface HeadingInfo {
  id: string
  level: number
  text: string
}

export interface HeadingTask {
  type: string
  cid: number
  /** Unique key: `type:cid`, used for indexing in the tracker */
  key: string
}

export interface ChapterTaskMap {
  /** Flat heading list in document order */
  headings: HeadingInfo[]
  /** headingId → list of submittable tasks below it (pure text headings map to an empty array) */
  tasksByHeading: Record<string, HeadingTask[]>
}

/**
 * Extract the heading list and the submittable tasks under each heading from tiptap JSON content
 */
export function extractChapterTasks(content: Record<string, any> | null | undefined): ChapterTaskMap {
  const headings: HeadingInfo[] = []
  const tasksByHeading: Record<string, HeadingTask[]> = {}
  let currentHeadingId: string | null = null

  function walk(node: any) {
    if (!node) return

    if (node.type === 'heading') {
      const id = node.attrs?.id || node.attrs?.['data-toc-id']
      const level = node.attrs?.level ?? 1
      const text = extractText(node.content)
      if (id) {
        headings.push({ id, level, text })
        currentHeadingId = id
        if (!tasksByHeading[id]) tasksByHeading[id] = []
      }
    }

    // vue nodes carry submittable components such as question/homework/comment/quiz/race
    if (node.type === 'vue' && SUBMITTABLE_TYPES.includes(node.attrs?.type)) {
      const type = node.attrs.type
      const cid = Number(node.attrs?.content) || 0
      if (cid && currentHeadingId) {
        if (!tasksByHeading[currentHeadingId]) tasksByHeading[currentHeadingId] = []
        tasksByHeading[currentHeadingId].push({ type, cid, key: `${type}:${cid}` })
      }
    }

    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(walk)
    }
  }

  walk(content)

  return { headings, tasksByHeading }
}
