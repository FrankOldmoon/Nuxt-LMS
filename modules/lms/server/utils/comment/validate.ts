/**
 * 评论富文本内容安全校验（H3：存储型 iframe/恶意内容注入）
 *
 * 评论 content 以 UMO/ProseMirror 文档 JSON 存储，前端 UMO 渲染器会把其中
 * 的 iframe 节点渲染为真实 <iframe>（src 直接透传），可被用于钓鱼/点击劫持。
 * 这里在服务端做节点黑名单校验：命中危险节点即拒绝整条评论。
 */
const DANGEROUS_NODE_TYPES = new Set(['iframe', 'script', 'html', 'foreignObject'])
// vue 节点中可渲染原始 HTML 的子类型（如 html 题的 raw HTML）
const DANGEROUS_VUE_TYPES = new Set(['html'])

/** 遍历文档树，返回命中的危险节点描述；无命中返回 null */
function findDangerousNode(node: any): string | null {
  if (!node || typeof node !== 'object') return null
  if (DANGEROUS_NODE_TYPES.has(node.type)) return node.type
  if (node.type === 'vue' && DANGEROUS_VUE_TYPES.has(node.attrs?.type)) {
    return `vue(${node.attrs.type})`
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      const hit = findDangerousNode(child)
      if (hit) return hit
    }
  }
  return null
}

/**
 * 校验评论内容；返回错误信息（null 表示通过）。
 * 支持：UMO 文档 JSON（对象或 JSON 字符串）、纯文本评论。
 */
export function validateCommentContent(content: any): string | null {
  if (content == null) return null
  let doc: any = content
  if (typeof content === 'string') {
    const trimmed = content.trim()
    if (!trimmed) return null
    // 纯文本评论（非 JSON 文档）直接放行，文本节点渲染时会被转义
    if (!trimmed.startsWith('{')) return null
    try {
      doc = JSON.parse(trimmed)
    } catch {
      return '评论内容格式不正确'
    }
  }
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.content)) {
    return '评论内容格式不正确'
  }
  const hit = findDangerousNode(doc)
  if (hit) return `评论内容包含不允许的节点：${hit}`
  return null
}
