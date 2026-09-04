/**
 * 站点统计脚本构建（谷歌分析 gtag.js / 百度统计 hm.baidu.com）
 *
 * token 留空 → 不注入对应脚本。
 * token 白名单校验：GA ID（G-/UA-/GT-/AW-/DC- 前缀 + 字母数字连字符）
 * 或百度 token（字母数字连字符，8~40 位）；不匹配则整体丢弃，防止配置注入恶意脚本。
 *
 * 返回 unhead 可识别的 script 数组（{ src } 外链 / { children } 内联）。
 */
export function buildAnalyticsScripts(googleTrackingId?: string, baiduTrackingId?: string) {
  // 白名单格式校验：GA 度量 ID / 百度统计 token
  const sanitize = (s: string) => {
    const v = String(s || '').trim()
    if (/^[GUTA][AW]?-[A-Za-z0-9-]+$/.test(v)) return v // G-XXXX / UA-XXX / GT-XXX ...
    if (/^[A-Za-z0-9-]{8,40}$/.test(v)) return v // 百度 token（32 位 hex 等）
    return ''
  }
  const script: any[] = []

  const gaId = sanitize(googleTrackingId)
  const baiduId = sanitize(baiduTrackingId)

  if (gaId) {
    script.push({
      src: `https://www.googletagmanager.com/gtag/js?id=${gaId}`,
      async: true,
    })
    script.push({
      children: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`,
    })
  }

  if (baiduId) {
    script.push({
      children: `var _hmt=_hmt||[];(function(){var hm=document.createElement("script");hm.src="https://hm.baidu.com/hm.js?${baiduId}";var s=document.getElementsByTagName("script")[0];s.parentNode.insertBefore(hm,s);})();`,
    })
  }

  return script
}
