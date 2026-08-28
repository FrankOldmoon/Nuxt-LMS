/**
 * 检测当前页面是否被其他课程页以 iframe 嵌入（同源）。
 * 命中 /course/{宿主课程id}... 时返回宿主课程 id，否则返回 0。
 * 仅在被 iframe 嵌入且同源时生效；跨域或非嵌入场景返回 0。
 *
 * 供各提交通道路用：作业/测验/竞赛等提交时把宿主课程 id 带给后端，
 * 由服务端把相同加分镜像到宿主课程。
 */
export function useEmbeddingParentCourse(): number {
  if (typeof window === 'undefined' || typeof window.parent === 'undefined') return 0
  if (window.parent === window.self) return 0
  try {
    const href = window.parent.location.href || ''
    const m = href.match(/\/course\/(\d+)(?=[/?#]|$)/)
    return m ? Number(m[1]) || 0 : 0
  } catch {
    // 跨域访问父页面信息被浏览器阻止
    return 0
  }
}