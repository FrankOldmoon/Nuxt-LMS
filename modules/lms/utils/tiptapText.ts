/**
 * Tiptap JSON 纯文本提取工具（模块内共享，取代散落在各处的 extractText 副本）
 *
 * 兼容三种输入：字符串、节点数组、单个节点对象。
 * 显式处理 codeBlock —— 从其 content 中可靠提取代码（而非依赖通用递归）。
 */

export interface ExtractTextOptions {
  /**
   * codeBlock 节点的处理方式：
   * - 'raw'（默认）：提取代码块内的纯代码文本
   * - 'fence'：用 ```lang 围栏包裹（便于 markdown 渲染 / AI 上下文）
   * - 'skip'：跳过代码块
   */
  codeBlock?: 'raw' | 'fence' | 'skip'
}

/**
 * 从 Tiptap JSON 节点递归提取纯文本。
 *
 * @example
 * extractText(doc)                            // codeBlock 返回原始代码
 * extractText(doc, { codeBlock: 'fence' })    // codeBlock 用 ```lang 包裹
 * extractText(doc, { codeBlock: 'skip' })     // codeBlock 不提取
 */
export function extractText(node: any, options?: ExtractTextOptions): string {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map((n) => extractText(n, options)).join('')

  // 文本节点
  if (node.type === 'text') return node.text ?? ''
  // 兜底：某些自定义节点直接把文本放在 text 字段
  if (typeof node.text === 'string') return node.text

  // 代码块：显式提取代码内容（不再依赖通用 content 递归）
  if (node.type === 'codeBlock') {
    const mode = options?.codeBlock ?? 'raw'
    if (mode === 'skip') return ''
    const code = (node.content || []).map((c: any) => c.text || '').join('')
    if (mode === 'fence') {
      const lang = node.attrs?.language || ''
      return `\n\`\`\`${lang}\n${code}\n\`\`\`\n`
    }
    return code
  }

  // 通用递归：进入子节点
  if (node.content && Array.isArray(node.content)) {
    return node.content.map((c: any) => extractText(c, options)).join('')
  }
  return ''
}

/**
 * 将 Tiptap JSON content 提取为纯文本（容错入口，兼容字符串/对象/数组）。
 */
export function contentToText(content: any, options?: ExtractTextOptions): string {
  if (typeof content === 'string') return content
  if (content && typeof content === 'object') return extractText(content, options)
  return ''
}
