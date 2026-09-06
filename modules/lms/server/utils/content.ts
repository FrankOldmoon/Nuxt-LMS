import { markdownToTiptap } from '../../utils/markdown'

/**
 * 后端统一把"可能为 markdown 字符串的 content"规范化为 tiptap doc JSON。
 *
 * 普通用户（无源代码）无法运行 node 脚本转 markdown，因此在课程/章节的新增或
 * 更新接口里也直接支持传 markdown 文本：这里是字符串 → 调 markdownToTiptap 转成
 * doc（并给没带 id 的 heading 补 id/data-toc-id，保证右侧 TOC 可用）；
 * 已经是对象（tiptap doc）或 null → 原样返回。
 */
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
    addHeadingIds(doc)
    return doc
  }
  return content
}