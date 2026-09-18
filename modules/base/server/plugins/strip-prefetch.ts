/**
 * 首屏 prefetch 收敛（Nitro 层）
 *
 * Nuxt 会把「入口的全部动态导入」（= 所有页面/布局的 chunk）在首屏 HTML 的 <head> 里
 * 输出 <link rel="prefetch">。实测首页带出 56 个链接 / 7.79 MB 原始（brotli 1.81 MB），
 * 含编辑器页的 monaco(3.2 MB)、报表页的 echarts、导出用的 docx 等——这些预取会和首屏
 * 关键路径（entry + modulepreload）抢带宽，而当次访问绝大多数根本用不到。
 *
 * 这里在响应出站前统一剔除（只处理 text/html，且先用 includes 短路，开销可忽略）。
 * 导航时仍由 NuxtLink 的 hover 预取（客户端按需 import）兜底，代价仅是首次进入某页
 * 多一次按需请求，换掉首屏近 2 MB 无效预取。
 *
 * 注：之所以放在 Nitro 插件而不是 Nuxt 模块的 render:html hook——实测模块侧的
 * render:html 回调没有被序列化进 server 构建（构建产物中查不到该回调），故用 Nitro
 * 原生钩子更可靠。如需恢复框架默认行为，删除本文件即可。
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:response', (response: any) => {
    const contentType = response?.headers?.['content-type'] || ''
    if (contentType && !String(contentType).includes('text/html')) return
    const body = response?.body
    if (typeof body !== 'string' || !body.includes('rel="prefetch"')) return
    response.body = body.replace(/<link[^>]*rel="prefetch"[^>]*>/gi, '')
  })
})
