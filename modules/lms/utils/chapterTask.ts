/**
 * 章节任务提取工具
 *
 * 从 tiptap JSON 内容中提取所有 heading 及其下方可提交的任务节点
 * （question / homework / comment / quiz / race），用于判断每个 heading 的完成状态。
 *
 * 规则：
 * - 只有「顶层 + 带 id + 标题文本非空」的 heading 才计入进度（progressHeadingId）
 *   —— 与目录 extractTocFromContent、渲染端 blockLayout、服务端 is_pass 口径一致；
 * - 一个 heading 的范围从它本身到下一个**计入进度**的 heading 为止
 * - 范围内若无可提交任务 → 纯文字 heading，需停留 3s 完成
 * - 范围内若有可提交任务 → 全部答对/提交后才算完成
 */
import { extractText } from './tiptapText'
import { progressHeadingId } from './progressHeading'

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

  // topLevel=true 表示 doc 的直接子块：只有它们能作为「计入进度的 heading」
  // （与 blockLayout / 服务端 is_pass 口径一致：嵌套在容器里的 heading 不计入）
  function walk(node: any, topLevel: boolean) {
    if (!node) return

    if (topLevel) {
      const id = progressHeadingId(node)
      if (id) {
        headings.push({ id, level: node.attrs?.level ?? 1, text: extractText(node.content) })
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
      node.content.forEach((child: any) => walk(child, false))
    }
  }

  const topBlocks: any[] = Array.isArray(content?.content) ? content.content : []
  topBlocks.forEach((block: any) => walk(block, true))

  return { headings, tasksByHeading }
}
