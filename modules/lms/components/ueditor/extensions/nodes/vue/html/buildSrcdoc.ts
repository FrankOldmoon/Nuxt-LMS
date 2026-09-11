/**
 * 构造可自动上报高度的 iframe srcdoc
 *
 * 将用户 HTML 包裹为基础文档（或往完整文档注入脚本），插入高度上报脚本：
 * 内容加载/变化时通过 parent.postMessage({ type: 'html-node-height', height }) 通知父窗口。
 * 父窗口收到后更新 iframe 高度，实现内容自适应。
 */

const HEIGHT_REPORT_SCRIPT = `
(function () {
  // 视口自适应内容（html/body height:100% 全屏布局）无法测量自然高度，
  // 当前视口过小时给一个合理的默认高度
  var DEFAULT_HEIGHT = 600;
  function reportHeight() {
    var body = document.body;
    var doc = document.documentElement;
    var viewH = window.innerHeight;
    // body 内容实际高度（不受 iframe 视口高度影响）
    var bodyH = body ? body.getBoundingClientRect().height : 0;
    var scrollH = Math.max(body ? body.scrollHeight : 0, doc ? doc.scrollHeight : 0);
    var h = bodyH;
    if (scrollH > viewH) {
      // 内容溢出视口（如 html/body height:100% 布局中内容超出）时，scrollHeight 才是真实所需高度
      h = Math.max(h, scrollH);
    } else if (bodyH >= viewH && viewH < DEFAULT_HEIGHT) {
      // 内容被拉伸填满视口且未溢出 → 视口自适应布局，当前视口过小，使用默认高度
      h = DEFAULT_HEIGHT;
    }
    if (h > 0) parent.postMessage({ type: 'html-node-height', height: h }, '*');
  }
  if (document.readyState === 'complete') reportHeight();
  else window.addEventListener('load', reportHeight);
  // SSR/hydration 时序兜底：首条消息可能在父页面 onMounted 监听器注册前发出而丢失，
  // 延迟重发确保父页面一定能收到并更新高度
  [50, 200, 500, 1000].forEach(function (ms) {
    setTimeout(reportHeight, ms);
  });
  new MutationObserver(reportHeight).observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
`

const WRAP_STYLE = `
* { box-sizing: border-box; }
img { max-width: 100%; height: auto; }
body { margin: 0; padding: 8px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
`

/** 将用户 HTML 构造为可自动上报高度的 srcdoc（完整文档则注入脚本，片段则包裹为标准文档） */
export function buildSrcdocWithHeightReport(userHtml: string): string {
  const html = userHtml || ''
  const script = `<script>${HEIGHT_REPORT_SCRIPT}<\/script>`

  // 已是完整 HTML 文档 → 在 </body> 前注入脚本
  const isFullDoc = /<html[\s>]/i.test(html) || /<!DOCTYPE/i.test(html)
  if (isFullDoc) {
    if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${script}</body>`)
    return `${html}${script}`
  }

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>${WRAP_STYLE}</style>
</head><body>${html}
${script}
</body></html>`
}
