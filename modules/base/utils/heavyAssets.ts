/**
 * 重量级第三方库的可配置资源基址。
 *
 * 这些库体积过大，不随仓库分发（Babylon 7MB、Univer+React 10MB、ffmpeg core 25MB、
 * web-llm 6MB+模型权重、three+three-vrm 2MB）：
 * - 默认走公网 CDN；
 * - 内网 / 无外网部署时，用环境变量指向本地镜像即可完全脱网：
 *     NUXT_PUBLIC_NPM_ASSETS_BASE  （镜像 jsdelivr 的 npm 路径布局）
 *     NUXT_PUBLIC_ESM_ASSETS_BASE  （ESM 依赖，镜像 esm.sh 的路径布局）
 *
 * 轻量依赖不在这里：它们由 scripts/copy-vendor-assets.mjs 落到 public/vendor，同源加载。
 */

/** 读取 public 配置；在无 Nuxt 上下文（单测 / 纯模块）时回退默认值，不抛错 */
function publicConfig(): Record<string, any> {
  try {
    return (useRuntimeConfig?.()?.public || {}) as Record<string, any>
  } catch {
    return {}
  }
}

function trimSlash(url: string): string {
  return String(url || '').replace(/\/+$/, '')
}

/** jsdelivr 风格 npm 资源基址（默认 https://cdn.jsdelivr.net/npm） */
export function npmAssetsBase(): string {
  return trimSlash(publicConfig().npmAssetsBase || 'https://cdn.jsdelivr.net/npm')
}

/** ESM 资源基址（默认 https://esm.sh） */
export function esmAssetsBase(): string {
  return trimSlash(publicConfig().esmAssetsBase || 'https://esm.sh')
}

/** 拼 npm 资源地址，如 npmAsset('babylonjs@latest/babylon.js') */
export function npmAsset(path: string): string {
  return `${npmAssetsBase()}/${String(path).replace(/^\/+/, '')}`
}

/** 拼 ESM 资源地址，如 esmAsset('three@0.169.0') */
export function esmAsset(path: string): string {
  return `${esmAssetsBase()}/${String(path).replace(/^\/+/, '')}`
}

/**
 * jsdelivr 的 +esm 入口（等价于 esm.run），用作 ESM 主源的兜底：
 * premium ESM 源不可达时，仍可从 npm 镜像取得同一份 ESM 产物。
 */
export function npmEsmAsset(path: string): string {
  return `${npmAssetsBase()}/${String(path).replace(/^\/+/, '')}/+esm`
}
