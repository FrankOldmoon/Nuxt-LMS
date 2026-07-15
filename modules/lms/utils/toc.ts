import { extractText } from './tiptapText'

export interface TocLink {
  id: string
  text: string
  children?: TocLink[]
}

/**
 * Block-level node types: the inline text within these nodes is extracted as a single text block
 */
const BLOCK_NODE_TYPES = new Set([
  'paragraph', 'heading', 'codeBlock', 'blockquote',
  'listItem', 'taskItem', 'tableCell', 'tableHeader',
])

/**
 * Extract all plain text from TipTap doc JSON (block-level nodes separated by newlines)
 * Used to provide chapter content as AI knowledge base context.
 *
 * @param content TipTap doc JSON object, or a string (returned directly)
 * @param maxChars Maximum character count; if exceeded, the tail is truncated and an ellipsis hint is appended (default: no limit)
 */
export function extractPlainText(content: any, maxChars = Infinity): string {
  if (!content) return ''
  // String (markdown / plain text) returned directly
  if (typeof content === 'string') {
    return maxChars < content.length ? content.slice(0, maxChars) + '\n…(Content too long, truncated)' : content
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
    // Block-level node: collect inline text as a whole, do not recurse into child nodes
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
    result = result.slice(0, maxChars) + '\n…(Content too long, truncated)'
  }
  return result
}

/**
 * Extract all heading nodes from tiptap JSON content and build a nested TOC tree
 *
 * The heading node's attrs contain:
 * - id → used as the anchor id
 * - level → heading level (1-6)
 *
 * Returns a TocLink array nested by level (supports h1→h2→h3 three-level nesting)
 */
export function extractTocFromContent(content: Record<string, any> | null | undefined): TocLink[] {
  if (!content) return []

  const flatHeadings: { id: string; text: string; level: number }[] = []

  // Recursively traverse to find all heading nodes
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

  // Build nested tree using a stack
  const root: TocLink[] = []
  const levelStack: { level: number; node: TocLink }[] = []

  for (const heading of flatHeadings) {
    const link: TocLink = { id: heading.id, text: heading.text, children: [] }

    // Pop all stack frames whose level is not less than the current heading
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

  // Clean up empty children of remaining nodes in the stack
  for (const item of levelStack) {
    if (!item.node.children?.length) delete item.node.children
  }

  return root
}
