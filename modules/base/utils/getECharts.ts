/**
 * ECharts 共享加载器：本地 npm 包动态导入 + 设置全局 window.echarts（幂等）。
 *
 * 不再走 CDN：通过 import('echarts') 由 Vite 打包进本地产物。
 * 动态导入保证在 SSR（服务端）阶段不执行浏览器相关代码；
 * 设置 window.echarts 是为了兼容 Univer 等以全局变量方式引用 echarts 的场景。
 */
let echartsPromise: Promise<any> | null = null

export function getECharts(): Promise<any> {
  if (typeof window !== 'undefined' && (window as any).echarts) {
    return Promise.resolve((window as any).echarts)
  }
  if (echartsPromise) return echartsPromise
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('ECharts 仅在浏览器环境可用'))
  }

  echartsPromise = import('echarts').then((mod) => {
    const lib = (mod as any).default ?? mod
    ;(window as any).echarts = lib
    return lib
  })

  // 失败时清空缓存，允许下次重试
  echartsPromise.catch(() => { echartsPromise = null })
  return echartsPromise
}