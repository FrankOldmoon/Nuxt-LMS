/**
 * 站点统计脚本注入（谷歌分析 gtag.js / 百度统计 hm.js）
 *
 * 客户端专用：等待 LMS 公开配置（useState('lms-public-config')）就绪后，
 * 真正向 document.head 追加 <script> 节点，保证脚本在浏览器中执行。
 *
 * 兼容原因：
 *   - useHead({ script }) 在 SSR 阶段求值，若此时配置尚未就绪则不会注入；
 *     且 unhead 对内联 script 的执行时机不可控。改为客户端手动 append，
 *     createElement 追加的内联脚本会被浏览器执行，外链脚本会加载。
 *   - token 留空不注入；同一 id 已存在时去重，避免重复埋点。
 */
import { useLmsPublicConfig } from '../composables/useLmsPublicConfig'

export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const { analytics } = useLmsPublicConfig()

  // 白名单格式校验（与 utils/analyticsScripts.ts 保持一致）
  const sanitize = (s: string) => {
    const v = String(s || '').trim()
    if (/^[GUTA][AW]?-[A-Za-z0-9-]+$/.test(v)) return v // G-XXXX / UA-XXX / GT-XXX ...
    if (/^[A-Za-z0-9-]{8,40}$/.test(v)) return v // 百度 token（32 位 hex 等）
    return ''
  }

  const injectGA = (gaId: string) => {
    // 去重：已存在该 id 的 gtag.js 则跳过
    if (Array.from(document.scripts).some(s => s.src.includes('googletagmanager.com/gtag/js?id=' + gaId))) return
    const gtagSrc = document.createElement('script')
    gtagSrc.async = true
    gtagSrc.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
    document.head.appendChild(gtagSrc)

    const configScript = document.createElement('script')
    configScript.textContent =
      `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`
    document.head.appendChild(configScript)
  }

  const injectBaidu = (baiduId: string) => {
    // 去重：已有该 token 的 hm.js 则跳过
    if (Array.from(document.scripts).some(s => s.src.includes('hm.baidu.com/hm.js?' + baiduId))) return
    const hm = document.createElement('script')
    hm.textContent =
      `var _hmt=_hmt||[];(function(){var hm=document.createElement("script");hm.src="https://hm.baidu.com/hm.js?${baiduId}";var s=document.getElementsByTagName("script")[0];s.parentNode.insertBefore(hm,s);})();`
    document.head.appendChild(hm)
  }

  const ensure = () => {
    const gaId = sanitize(analytics.value?.googleTrackingId)
    const baiduId = sanitize(analytics.value?.baiduTrackingId)
    if (gaId) injectGA(gaId)
    if (baiduId) injectBaidu(baiduId)
  }

  // 配置就绪即注入；配置发生变化（WS 广播刷新）时自动更新
  watch(
    () => [analytics.value?.googleTrackingId, analytics.value?.baiduTrackingId],
    ensure,
    { immediate: true, deep: true },
  )
})