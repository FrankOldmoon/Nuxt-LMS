/**
 * Tiptap JSON plain text extraction utility (shared within the module, replacing scattered extractText copies)
 *
 * Supports three input types: string, node array, single node object.
 * Explicitly handles codeBlock — reliably extracts code from its content (instead of relying on generic recursion).
 */

export interface ExtractTextOptions {
  /**
   * How to handle codeBlock nodes:
   * - 'raw' (default): extract the plain code text within the code block
   * - 'fence': wrap with ```lang fence (for markdown rendering / AI context)
   * - 'skip': skip code blocks
   */
  codeBlock?: 'raw' | 'fence' | 'skip'
}

/**
 * Recursively extract plain text from a Tiptap JSON node.
 *
 * @example
 * extractText(doc)                            // codeBlock returns raw code
 * extractText(doc, { codeBlock: 'fence' })    // codeBlock wrapped with ```lang
 * extractText(doc, { codeBlock: 'skip' })     // codeBlock not extracted
 */
export function extractText(node: any, options?: ExtractTextOptions): string {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map((n) => extractText(n, options)).join('')

  // Text node
  if (node.type === 'text') return node.text ?? ''
  // Fallback: some custom nodes put text directly in the text field
  if (typeof node.text === 'string') return node.text

  // Code block: explicitly extract code content (no longer relies on generic content recursion)
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

  // Generic recursion: descend into child nodes
  if (node.content && Array.isArray(node.content)) {
    return node.content.map((c: any) => extractText(c, options)).join('')
  }
  return ''
}

/**
 * Extract Tiptap JSON content as plain text (fault-tolerant entry, compatible with string/object/array).
 */
export function contentToText(content: any, options?: ExtractTextOptions): string {
  if (typeof content === 'string') return content
  if (content && typeof content === 'object') return extractText(content, options)
  return ''
}
