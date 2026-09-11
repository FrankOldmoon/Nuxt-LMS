/**
 * Tiptap JSON → Markdown 转换（markdownToTiptap 的逆操作）
 *
 * 覆盖编辑器/章节内容常用的节点：标题、段落、列表（含任务列表）、代码块、引用、
 * 表格、分割线、公式、图片、链接与文本样式，以及扩展围栏节点
 * （question/html/callout/details/columns/iframe/mindmap/pintora 等）。
 * 无法还原为 markdown 语法的节点（tabs/stepper/vfiles/sheet/echarts 等）以
 * ```json 代码块保存原始结构，避免丢数据。
 */

interface TiptapMark {
  type: string;
  attrs?: Record<string, any>;
}

interface TiptapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TiptapNode[];
  text?: string;
  marks?: TiptapMark[];
}

/** 行内文本 + marks 渲染（粗体/斜体/删除线/行内代码/链接） */
function renderTextWithMarks(node: TiptapNode): string {
  let text = node.text ?? ''
  const marks = node.marks || []
  for (const m of marks) {
    switch (m.type) {
      case 'bold': text = `**${text}**`; break
      case 'italic': text = `*${text}*`; break
      case 'strike': text = `~~${text}~~`; break
      case 'code': text = `\`${text}\``; break
      case 'link': text = `[${text}](${m.attrs?.href || ''})`; break
      case 'subscript': text = `~${text}~`; break
      case 'superscript': text = `^${text}^`; break
      default: break // textStyle 等 markdown 无对应语法，保留文本
    }
  }
  return text
}

/** 行内节点渲染 */
function renderInline(nodes: TiptapNode[] = []): string {
  return nodes.map((n) => {
    switch (n.type) {
      case 'text': return renderTextWithMarks(n)
      case 'hardBreak': return '  \n'
      case 'inlineMath': return `$${n.attrs?.latex || ''}$`
      case 'image': return `![${n.attrs?.alt || ''}](${n.attrs?.src || ''})`
      case 'select': return `||${n.attrs?.content || ''}||`
      case 'inputs': return '{{ }}'
      case 'mention': return n.attrs?.id ? `@${n.attrs.id}` : ''
      default: return renderInline(n.content || [])
    }
  }).join('')
}

/** 列表渲染（支持嵌套） */
function renderList(node: TiptapNode, ordered: boolean): string {
  const lines: string[] = []
  const walk = (items: TiptapNode[], level: number) => {
    let index = 1
    for (const item of items) {
      const blocks = item.content || []
      const para = blocks.find((b) => b.type === 'paragraph')
      const nestedList = blocks.find((b) => b.type === 'bulletList' || b.type === 'orderedList')
      const indent = '  '.repeat(level)
      const prefix = ordered ? `${index}. ` : '- '
      const text = para ? renderInline(para.content || []) : ''
      if (item.type === 'taskItem') {
        const checked = item.attrs?.checked ? '[x]' : '[ ]'
        lines.push(`${indent}- ${checked} ${text}`.trimEnd())
      } else {
        lines.push(`${indent}${prefix}${text}`.trimEnd())
      }
      if (nestedList) walk(nestedList.content || [], level + 1)
      index++
    }
  }
  walk(node.content || [], 0)
  return lines.join('\n')
}

/** 表格渲染 */
function renderTable(node: TiptapNode): string {
  const rows = (node.content || []).map((row) =>
    (row.content || []).map((cell) =>
      renderInline((cell.content?.[0]?.content as TiptapNode[] | undefined) || []),
    ),
  )
  if (!rows.length) return ''
  const header = rows[0]
  const sep = header.map(() => '---').join(' | ')
  const lines = [`| ${header.join(' | ')} |`, `| ${sep} |`]
  for (const row of rows.slice(1)) lines.push(`| ${row.join(' | ')} |`)
  return lines.join('\n')
}

/** vue 节点渲染（question/html/mindmap/pintora 等可逆类型用对应围栏） */
function renderVueNode(node: TiptapNode): string {
  const type = node.attrs?.type as string
  const content = node.attrs?.content as any
  const jsonText = typeof content === 'string' ? content : JSON.stringify(content, null, 2)

  switch (type) {
    case 'question':
      return '```question\n' + jsonText + '\n```'
    case 'html':
      return ':::html\n' + jsonText + '\n:::'
    case 'mindmap':
      return ':::mindmap\n' + jsonText + '\n:::'
    case 'pintora':
      return ':::pintora\n' + jsonText + '\n:::'
    default:
      // tabs/stepper/vfiles/sheet/echarts 等：无法还原为原始 markdown 正文，用 json 代码块保留数据
      return '```json\n' + JSON.stringify({ type, content }, null, 2) + '\n```'
  }
}

/** 块级节点渲染（每项返回一段 markdown） */
function renderBlock(node: TiptapNode): string {
  switch (node.type) {
    case 'paragraph': {
      const inner = renderInline(node.content || [])
      return inner.trim() === '' ? '' : inner
    }
    case 'heading': {
      const level = Math.min(Number(node.attrs?.level) || 1, 6)
      return `${'#'.repeat(level)} ${renderInline(node.content || [])}`
    }
    case 'bulletList': return renderList(node, false)
    case 'orderedList': return renderList(node, true)
    case 'taskList': return renderList(node, false)
    case 'codeBlock': {
      const lang = node.attrs?.language || ''
      const code = (node.content || []).map((n) => n.text ?? '').join('')
      return '```' + lang + '\n' + code + '\n```'
    }
    case 'blockquote': {
      const inner = renderBlocks(node.content || [])
      const quoted = inner.filter((l) => l !== '')
        .map((l) => l.split('\n').map((line) => `> ${line}`).join('\n'))
      return quoted.join('\n')
    }
    case 'table': return renderTable(node)
    case 'horizontalRule': return '---'
    case 'blockMath': return '$$\n' + (node.attrs?.latex || '') + '\n$$'
    case 'image': return `![${node.attrs?.alt || ''}](${node.attrs?.src || ''})`
    case 'iframe': {
      const src = node.attrs?.src || ''
      const height = node.attrs?.height ? ` height=${node.attrs.height}` : ''
      return `:::iframe src="${src}"${height}\n${src}\n:::`
    }
    case 'callout': {
      const icon = node.attrs?.icon ? ` icon=${node.attrs.icon}` : ''
      const bg = node.attrs?.backgroundColor ? ` bg="${node.attrs.backgroundColor}"` : ''
      return `:::callout${icon}${bg}\n${renderBlocks(node.content || []).filter(Boolean).join('\n\n')}\n:::`
    }
    case 'details': {
      const summary = node.content?.find((c) => c.type === 'detailsSummary')
      const body = node.content?.find((c) => c.type === 'detailsContent')
      const title = summary ? renderBlocks(summary.content || []).filter(Boolean).join(' ').replace(/\n/g, ' ') : '更多详情'
      const bodyMd = body ? renderBlocks(body.content || []).filter(Boolean).join('\n\n') : ''
      return `:::details title="${title}"\n${bodyMd}\n:::`
    }
    case 'columnContainer': {
      const cols = (node.content || []).map((col) => {
        const width = col.attrs?.colWidth ? ` width=${col.attrs.colWidth}` : ''
        const inner = renderBlocks(col.content || []).filter(Boolean).join('\n\n')
        return `:::col${width}\n${inner}\n:::`
      })
      return `:::columns\n${cols.join('\n')}\n:::`
    }
    case 'vue': return renderVueNode(node)
    case 'taskItem':
    case 'listItem': return renderList({ type: 'bulletList', content: [node] }, false)
    default: {
      // 未识别的容器节点：递归渲染子内容；叶子节点输出文本
      if (node.content?.length) return renderBlocks(node.content).filter(Boolean).join('\n\n')
      return node.text ?? ''
    }
  }
}

/** 块序列渲染，返回段落数组 */
function renderBlocks(nodes: TiptapNode[] = []): string[] {
  return nodes.map(renderBlock)
}

/**
 * Tiptap JSON doc → Markdown 字符串
 * @param doc 支持 { json } 包装或纯 tiptap doc
 */
export function tiptapToMarkdown(doc: any): string {
  const root = doc?.json ?? doc
  if (!root) return ''
  if (typeof root === 'string') return root
  const blocks = renderBlocks(root.content || [])
  return blocks.filter(Boolean).join('\n\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}
