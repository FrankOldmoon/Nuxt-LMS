/**
 * 全站禁止内容复制与拖拽（客户端兜底）
 *
 * CSS（assets/css/main.css）已用 user-select:none 让内容无法被选中，
 * 这里再拦截 copy / cut / dragstart，防止通过快捷键、浏览器菜单、
 * 拖拽图片/链接等方式把内容带走。
 *
 * 放行规则（否则会破坏正常输入与既有交互）：
 * - 教师（teacher）/ 管理员（admin）：整页允许复制/剪切，靠给 <html> 加 .allow-select
 *   恢复文本选中（见 assets/css/main.css），这里同步跳过 copy/cut 拦截
 * - 表单控件、富文本/代码编辑器（contenteditable 编辑器、Monaco）内部可正常复制/剪切
 * - 带 .allow-copy 类的容器
 * - 业务拖拽控件：原生 draggable="true"（流程图/逻辑门/分组）+ vuedraggable 的
 *   data-draggable（排序题/分类题等，SortableJS 原生拖拽模式）
 *   → 拖拽可用，但数据会在冒泡阶段被「消毒」：清空 text/plain、Text、text/html、
 *     text/uri-list，保证拖到其它文本框/站点不带出任何文字（自定义 MIME 不受影响）
 *
 * 注：不拦截 contextmenu，避免与流程图的右键菜单等自定义行为冲突。
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  /** 可编辑/显式放行区域：其中复制、剪切不受限制 */
  const EDITABLE_SELECTOR = [
    'input',
    'textarea',
    'select',
    '[contenteditable]:not([contenteditable="false"])',
    '.monaco-editor',
    '.allow-copy',
  ].join(',')

  /**
   * 业务拖拽控件选择器：
   * - draggable="true"：原生 HTML5 拖拽（流程图 / 逻辑门 / 课程分组学生卡片）
   * - data-draggable：vuedraggable（SortableJS）给拖拽项加的标记（排序题 / 分类题）
   */
  const DRAG_WIDGET_SELECTOR = '[draggable="true"], [data-draggable]'

  /** 需要清空的文本类拖拽数据类型（含大小写变体与旧式 'Text'） */
  const TEXT_DRAG_TYPES = ['text/plain', 'Text', 'text', 'text/html', 'text/uri-list']

  /** 事件目标是否位于可编辑/放行区域内 */
  function inAllowedArea(target: EventTarget | null): boolean {
    const el = target as Element | null
    return !!el?.closest?.(EDITABLE_SELECTOR)
  }

  /** 教师 / 管理员：整页放行复制与剪切 */
  function canCopy(): boolean {
    const roles = (useNuxtApp().payload.data['auth:me'] as { roles?: { code: string }[] } | null)
      ?.roles ?? []
    return roles.some(r => r.code === 'teacher' || r.code === 'admin')
  }

  /**
   * 给 <html> 打上 .allow-select：恢复整页文本选中（CSS 用 user-select: text）。
   * 登录 / 登出只刷新 /api/auth/me 并广播 auth:changed，故需在启动与切换后重算。
   */
  function syncAllowSelect() {
    document.documentElement.classList.toggle('allow-select', canCopy())
  }
  syncAllowSelect()
  useNuxtApp().hook('app:mounted', syncAllowSelect)
  window.addEventListener('auth:changed', syncAllowSelect)

  function onCopyCut(e: Event) {
    if (canCopy() || inAllowedArea(e.target)) return
    e.preventDefault()
  }

  /**
   * 捕获阶段：决定是否允许本次拖拽。
   *
   * - 业务拖拽控件（排序题等）：放行，交给 SortableJS / 组件自身处理
   * - 其它（图片、链接、正文选中文字等）：阻止，拖不起来
   *
   * 此时不清空数据：SortableJS 会在元素自身的 dragstart 里
   * setData('Text', textContent)，必须等它写完再消毒（见 onDragStartSanitize）。
   */
  function onDragStartCapture(e: DragEvent) {
    const el = e.target as Element | null
    if (el?.closest?.(DRAG_WIDGET_SELECTOR)) return
    e.preventDefault()
  }

  /**
   * 冒泡阶段（document 最后触发）：清空拖拽数据里的文本内容。
   *
   * 保留自定义 MIME（流程图 application/flowchart、逻辑门 application/vueflow），
   * 只把文本类数据置空，这样拖到其它网站的文本框/编辑器不会粘出任何文字或 URL。
   */
  function onDragStartSanitize(e: DragEvent) {
    if (e.defaultPrevented) return
    const dt = e.dataTransfer
    if (!dt) return
    for (const type of TEXT_DRAG_TYPES) {
      try {
        dt.setData(type, '')
      } catch { /* 个别浏览器不接受某些类型，忽略即可 */ }
    }
  }

  // 捕获阶段拦截，确保在其他监听器之前生效
  document.addEventListener('copy', onCopyCut, true)
  document.addEventListener('cut', onCopyCut, true)
  document.addEventListener('dragstart', onDragStartCapture, true)
  // 冒泡阶段消毒：晚于组件自身的 dragstart（如 SortableJS 的 setData）
  document.addEventListener('dragstart', onDragStartSanitize, false)
})
