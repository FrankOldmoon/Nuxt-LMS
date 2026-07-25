/**
 * 课程导入：ID 映射辅助函数
 *
 * 1. remapIdArray   - 用映射重写数字 id 数组
 * 2. remapContentIds - 递归遍历 Tiptap JSON，替换 vue 节点 cid
 * 3. remapOrderEntry - 重写 course.orders 中数字 id / parentId
 */
import type { ChapterIdMap } from './types'

/** 用映射重写数字 id 数组（找不到映射时保留原值，过滤非正整数） */
export function remapIdArray(ids: any, map: Map<number, number>): number[] {
  if (!Array.isArray(ids)) return []
  return ids
    .map((v) => map.get(Number(v)) || Number(v))
    .filter((n) => Number.isFinite(n) && n > 0)
}

/**
 * 递归遍历 Tiptap JSON，替换 vue 节点的 cid
 * node.attrs.type 决定用哪个映射
 */
export function remapContentIds(content: any, maps: Record<string, Map<number, number>>): any {
  if (!content) return content
  const map = (node: any): any => {
    if (!node || typeof node !== 'object') return node
    if (node.type === 'vue' && node.attrs?.type && node.attrs?.content != null) {
      const m = maps[node.attrs.type]
      if (m) {
        const oldCid = Number(node.attrs.content)
        const newCid = m.get(oldCid)
        if (newCid != null) {
          return { ...node, attrs: { ...node.attrs, content: String(newCid) } }
        }
      }
    }
    if (Array.isArray(node.content)) {
      return { ...node, content: node.content.map(map) }
    }
    if (node.content && typeof node.content === 'object') {
      return { ...node, content: map(node.content) }
    }
    return node
  }
  return Array.isArray(content) ? content.map(map) : map(content)
}

/**
 * 重写 course.orders 的单个 entry：
 * - 'course' 节点保持不变
 * - 'custom-xxx' 自定义分组保持不变
 * - 数字 id（章节）和 parentId 中的数字 id（嵌套子章节）按 chapterIdMap 重写
 */
export function remapOrderEntry(o: any, chapterIdMap: ChapterIdMap): any {
  if (!o || typeof o !== 'object') return o
  const newItem: any = { ...o }
  if (typeof o.id === 'string' && o.id !== 'course' && !o.id.startsWith('custom-')) {
    const n = Number(o.id)
    if (Number.isFinite(n) && n > 0 && chapterIdMap.has(n)) {
      newItem.id = String(chapterIdMap.get(n))
    }
  }
  if (o.parentId != null && typeof o.parentId === 'string'
    && o.parentId !== 'course' && !o.parentId.startsWith('custom-')) {
    const pn = Number(o.parentId)
    if (Number.isFinite(pn) && pn > 0 && chapterIdMap.has(pn)) {
      newItem.parentId = String(chapterIdMap.get(pn))
    }
  }
  return newItem
}
