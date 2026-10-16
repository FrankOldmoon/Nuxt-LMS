import { markdownToTiptap } from '../../utils/markdown'

/**
 * 后端统一把"可能为 markdown 字符串的 content"规范化为 tiptap doc JSON。
 *
 * 普通用户（无源代码）无法运行 node 脚本转 markdown，因此在课程/章节的新增或
 * 更新接口里也直接支持传 markdown 文本：这里是字符串 → 调 markdownToTiptap 转成
 * doc（并给没带 id 的 heading 补 id/data-toc-id，保证右侧 TOC 可用）；
 * 已经是对象（tiptap doc）→ 删除空白 heading 后返回；null → 原样返回。
 */
/**
 * 删除 tiptap doc 中空白 heading（无内容或仅含空白文本）。
 * heading 内含非 text 节点（图片/公式等）时不算空白，保留。
 */
function removeEmptyHeadings(node: any): void {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node.content)) {
    node.content = node.content.filter((c: any) => {
      if (c?.type !== 'heading') return true
      const content = c.content
      if (!Array.isArray(content) || content.length === 0) return false
      return !content.every((t: any) => t?.type === 'text' && !String(t.text ?? '').trim())
    })
    node.content.forEach(removeEmptyHeadings)
  }
}

function addHeadingIds(node: any): void {
  if (!node || typeof node !== 'object') return
  if (node.type === 'heading') {
    if (!node.attrs?.id) {
      if (!node.attrs) node.attrs = {}
      const id = Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3)
      node.attrs.id = id
      node.attrs['data-toc-id'] = id
    }
  }
  if (Array.isArray(node.content)) node.content.forEach(addHeadingIds)
  else if (node.content && typeof node.content === 'object') addHeadingIds(node.content)
}

export function normalizeContent(content: any): any {
  if (typeof content === 'string') {
    const doc = markdownToTiptap(content)
    removeEmptyHeadings(doc)
    addHeadingIds(doc)
    return doc
  }
  // tiptap doc 对象：删除空白 heading 后返回
  removeEmptyHeadings(content)
  return content
}