/**
 * 「进度统计口径」的 heading 判定（前端进度面板 + 服务端 is_pass 的唯一来源）
 *
 * 统一规则（此前四处口径不一致，导致进度总数与实际可见/可完成的 heading 数不符）：
 * - 必须是**顶层块**：渲染端 blockLayout 只追踪顶层块，嵌套在容器里的 heading 无法被完成；
 * - 必须有 id（无 id 无法作为锚点，也不该成为一步）；
 * - 标题**文本必须非空**：目录 extractTocFromContent 本就要求文本非空，
 *   若空标题仍计入总数，它既在目录里看不到、在正文里又是空白，用户永远无法完成它
 *   （实测章节 57：分母 25 而人人卡在 24，缺的正是空标题 `nd5kac0wuc`，导致 is_pass 恒为 false）。
 */
import { extractText } from './tiptapText'

/** 判定单个节点是否是「计入进度的 heading」，是则返回其 id */
export function progressHeadingId(node: any): string | null {
  if (!node || node.type !== 'heading') return null
  const id = node.attrs?.id || node.attrs?.['data-toc-id']
  if (!id) return null
  if (!extractText(node.content).trim()) return null
  return String(id)
}

/** 顶层「计入进度的 heading」id 列表（不含合成的章节标题） */
export function listProgressHeadingIds(content: any): string[] {
  const topBlocks: any[] = Array.isArray(content?.content) ? content.content : []
  return topBlocks.map(progressHeadingId).filter((id): id is string => !!id)
}
