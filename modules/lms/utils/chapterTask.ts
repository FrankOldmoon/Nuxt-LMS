/**
 * 章节任务提取工具
 *
 * 从 tiptap JSON 内容中提取所有 heading 及其下方可提交的任务节点
 * （question / homework / comment / quiz / race），用于判断每个 heading 的完成状态。
 *
 * 规则：
 * - 一个 heading 的范围从它本身到下一个 heading（任意层级）为止
 * - 范围内若无可提交任务 → 纯文字 heading，需停留 5s 完成
 * - 范围内若有可提交任务 → 全部答对/提交后才算完成
 */
import { extractText } from './tiptapText'

/** 可提交的任务节点类型（对应 vue 节点的 attrs.type） */
export const SUBMITTABLE_TYPES = ['question', 'homework', 'comment', 'quiz', 'race'] as const

export interface HeadingInfo {
  id: string
  level: number
  text: string
}

export interface HeadingTask {
  type: string
  cid: number
  /** 唯一键：`type:cid`，用于在 tracker 中索引 */
  key: string
}

export interface ChapterTaskMap {
  /** 按文档顺序的扁平 heading 列表 */
  headings: HeadingInfo[]
  /** headingId → 其下方的可提交任务列表（纯文字 heading 对应空数组） */
  tasksByHeading: Record<string, HeadingTask[]>
}

/**
 * 从 tiptap JSON content 中提取 heading 列表与每个 heading 下的可提交任务
 *
 * @param preHeadingId 第一个 heading 之前内容的归属 heading id
 *   （章节页传合成 h1 的 id = chapterId，使开头就出现的 question/homework
 *   等可提交任务正确阻塞章节标题的完成；不传则丢弃，保持旧行为）
 */
export function extractChapterTasks(
  content: Record<string, any> | null | undefined,
  preHeadingId?: string,
): ChapterTaskMap {
  const headings: HeadingInfo[] = []
  const tasksByHeading: Record<string, HeadingTask[]> = {}
  let currentHeadingId: string | null = preHeadingId ?? null

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

    // vue 节点承载 question/homework/comment/quiz/race 等可提交组件
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
