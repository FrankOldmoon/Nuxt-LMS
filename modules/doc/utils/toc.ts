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
