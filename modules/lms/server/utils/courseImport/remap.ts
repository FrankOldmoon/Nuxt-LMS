/**
 * Course import: ID mapping helper functions
 *
 * 1. remapIdArray   - rewrite numeric id array using the mapping
 * 2. remapContentIds - recursively traverse Tiptap JSON, replacing vue node cid
 * 3. remapOrderEntry - rewrite numeric id / parentId in course.orders
 */
import type { ChapterIdMap } from './types'

/** Rewrite numeric id array using the mapping (keeps the original value when no mapping is found, filters non-positive integers) */
export function remapIdArray(ids: any, map: Map<number, number>): number[] {
  if (!Array.isArray(ids)) return []
  return ids
    .map((v) => map.get(Number(v)) || Number(v))
    .filter((n) => Number.isFinite(n) && n > 0)
}

/**
 * Recursively traverse Tiptap JSON, replacing the cid of vue nodes
 * node.attrs.type determines which mapping to use
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
 * Rewrite a single entry of course.orders:
 * - 'course' node remains unchanged
 * - 'custom-xxx' custom group remains unchanged
 * - Numeric id (chapter) and numeric id in parentId (nested sub-chapters) are rewritten via chapterIdMap
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
