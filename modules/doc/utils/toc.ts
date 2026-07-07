export interface TocLink {
  id: string
  text: string
  children?: TocLink[]
}

/**
 * 从 tiptap inline content 节点中递归提取纯文本
 */
function extractText(nodes: any[]): string {
  if (!nodes) return ''
  return nodes
    .map((node: any) => {
      if (node.type === 'text') return node.text ?? ''
      if (node.content) return extractText(node.content)
      return ''
    })
    .join('')
}

/**
 * 块级节点类型：这些节点的内部 inline 文本作为一个文本块整体提取
 */
const BLOCK_NODE_TYPES = new Set([
  'paragraph', 'heading', 'codeBlock', 'blockquote',
  'listItem', 'taskItem', 'tableCell', 'tableHeader',
])

/**
 * 从 TipTap doc JSON 中提取全部纯文本（块级节点以换行分隔）
 * 用于把章节内容作为 AI 知识库上下文。
 *
 * @param content TipTap doc JSON 对象，或字符串（直接返回）
 * @param maxChars 最大字符数，超出尾部截断并追加省略提示（默认不限制）
 */
export function extractPlainText(content: any, maxChars = Infinity): string {
  if (!content) return ''
  // 字符串（markdown / 纯文本）直接返回
  if (typeof content === 'string') {
    return maxChars < content.length ? content.slice(0, maxChars) + '\n…(内容过长已截断)' : content
  }
  const blocks: string[] = []

  function collectInline(node: any): string {
    if (!node) return ''
    if (node.type === 'text') return node.text ?? ''
    if (node.content && Array.isArray(node.content)) {
      return node.content.map(collectInline).join('')
    }
    return ''
  }

  function walk(node: any) {
    if (!node) return
    // 块级节点：整体收集 inline 文本，不再深入子节点
    if (BLOCK_NODE_TYPES.has(node.type)) {
      const text = collectInline(node).trim()
      if (text) blocks.push(text)
      return
    }
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(walk)
    }
  }

  walk(content)
  let result = blocks.join('\n')
  if (maxChars < result.length) {
    result = result.slice(0, maxChars) + '\n…(内容过长已截断)'
  }
  return result
}

/**
 * 从 tiptap JSON content 中提取所有 heading 节点，构建嵌套 TOC 树
 *
 * heading 节点的 attrs 包含：
 * - id → 用作锚点 id
 * - level → 标题层级 (1-6)
 *
 * 返回按层级嵌套的 TocLink 数组（支持 h1→h2→h3 三级嵌套）
 */
export function extractTocFromContent(content: Record<string, any> | null | undefined): TocLink[] {
  if (!content) return []

  const flatHeadings: { id: string; text: string; level: number }[] = []

  // 递归遍历找出所有 heading 节点
  function walk(node: any) {
    if (!node) return
    if (node.type === 'heading') {
      const headingId = node.attrs?.id || node.attrs?.['data-toc-id']
      const level = node.attrs?.level ?? 1
      const text = extractText(node.content)
      if (headingId && text) {
        flatHeadings.push({ id: headingId, text, level })
      }
    }
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(walk)
    }
  }

  walk(content)

  // 用栈构建嵌套树
  const root: TocLink[] = []
  const levelStack: { level: number; node: TocLink }[] = []

  for (const heading of flatHeadings) {
    const link: TocLink = { id: heading.id, text: heading.text, children: [] }

    // 弹出所有 level 不小于当前 heading 的栈帧
    while (levelStack.length > 0 && levelStack[levelStack.length - 1].level >= heading.level) {
      const popped = levelStack.pop()!
      if (!popped.node.children?.length) delete popped.node.children
    }

    if (levelStack.length === 0) {
      root.push(link)
    } else {
      const parent = levelStack[levelStack.length - 1].node
      if (!parent.children) parent.children = []
      parent.children.push(link)
    }

    levelStack.push({ level: heading.level, node: link })
  }

  // 清理栈中剩余节点的空 children
  for (const item of levelStack) {
    if (!item.node.children?.length) delete item.node.children
  }

  return root
}
