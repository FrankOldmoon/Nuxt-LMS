/**
 * 全站禁止内容复制与拖拽（客户端兜底）
 *
 * CSS（assets/css/main.css）已用 user-select:none 让内容无法被选中，
 * 这里再拦截 copy / cut / dragstart，防止通过快捷键、浏览器菜单、
 * 拖拽图片/链接等方式把内容带走。
 *
 * 放行规则（否则会破坏正常输入与既有交互）：
 * - 表单控件、富文本/代码编辑器（contenteditable 编辑器、Monaco）内部可正常复制/剪切
 * - 带 .allow-copy 类的容器
 * - 显式声明 draggable="true" 的业务拖拽控件（拖拽排序/分组/流程图/文件拖入等）；
 *   放行时仍会「消毒」拖拽数据：清空浏览器自动附带的 text/plain、text/html、
 *   text/uri-list，仅保留业务代码自设的自定义 MIME，保证拖到其它文本框/站点不带出任何文字
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

  /** 事件目标是否位于可编辑/放行区域内 */
  function inAllowedArea(target: EventTarget | null): boolean {
    const el = target as Element | null
    return !!el?.closest?.(EDITABLE_SELECTOR)
  }

  function onCopyCut(e: Event) {
    if (inAllowedArea(e.target)) return
    e.preventDefault()
  }

  /**
   * 拖拽拦截 + 数据消毒。
   *
   * - 非业务拖拽控件（图片/链接/普通文本等）：直接阻止，拖不起来。
   * - 业务拖拽控件（[draggable="true"]）：允许拖拽，但立即清空拖拽数据并显式置空
   *   文本/链接类型，只留下业务 handler 随后写入的自定义 MIME。这样即使拖到其它
   *   网站的文本框/编辑器，也不会粘出任何文字或 URL。
   *
   * 注意：本监听在捕获阶段（document → target），先于组件自身的 dragstart 执行，
   * 因此 clearData 不会清掉组件随后 setData 的自定义类型。
   */
  function onDragStart(e: DragEvent) {
    const el = e.target as Element | null
    if (!el?.closest?.('[draggable="true"]')) {
      e.preventDefault()
      return
    }
    const dt = e.dataTransfer
    if (!dt) return
    try {
      dt.clearData()
      // 显式置空文本类数据：部分浏览器 clearData 后仍会带上默认文本/选中内容
      dt.setData('text/plain', '')
      dt.setData('text/html', '')
      dt.setData('text/uri-list', '')
    } catch { /* 个别浏览器在异常时机写入会抛错，忽略即可 */ }
  }

  // 捕获阶段拦截，确保在其他监听器之前生效
  document.addEventListener('copy', onCopyCut, true)
  document.addEventListener('cut', onCopyCut, true)
  document.addEventListener('dragstart', onDragStart, true)
})
