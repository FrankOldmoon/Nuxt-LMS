// https://nuxt.com/docs/api/configuration/nuxt-config
// npx nuxt db generate
import { existsSync, copyFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

// nuxt prepare（含 postinstall）时，若 .env / ecosystem.config.cjs 缺失，则从 example 复制生成
function ensureFromExample(file: string, example: string) {
  if (existsSync(file)) return
  if (!existsSync(example)) return
  copyFileSync(example, file)
  console.log(`[nuxt] generated ${file} from ${example}`)
}

// 将 pyodide 运行时复制到 public/pyodide（脚本内含版本标记，幂等），构建/启动时同步本地资源
function syncPyodide() {
  try {
    execSync(`node "${new URL('./scripts/copy-pyodide.mjs', import.meta.url).pathname}"`, {
      stdio: 'inherit',
    })
  } catch {
    // 复制脚本内部已打印错误，这里静默避免打断后续命令
  }
}

// 生产构建时对 .output/public 做 Brotli 预压缩（替代 Nitro 内建压缩，见 modules/base/index.ts）。
// 时机：copyPublicAssets 之后、Nitro 生成 public-assets 清单之前，保证压缩产物可被运行时命中。
function precompressPublicAssets(dir: string) {
  try {
    execSync(
      `node "${new URL('./scripts/precompress-assets.mjs', import.meta.url).pathname}" "${dir}"`,
      { stdio: 'inherit' },
    )
  } catch {
    // 脚本内部已打印错误，静默避免打断构建
  }
}

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  // 仅生产构建关闭 server sourcemap（dev 保持 Nuxt 默认，调试体验不变）。
  // Nuxt 默认 sourcemap.server=true，代价很大：Vite SSR 会为 .nuxt/dist/server
  // 生成 hires map（50MB 产物里 map 占 33MB），Nitro 再为服务端产物生成 438 个 map。
  // 实测关闭后：SSR 构建 49.7s → 31.1s，Nitro rollup 75.3s → 47.4s，整体 -51s。
  // 代价：线上服务端报错堆栈指向打包后位置；需要排查线上问题时，把这里改成
  // sourcemap: { server: true } 再构建即可（本地 dev 不受影响）。
  $production: {
    sourcemap: { server: false },
  },
  hooks: {
    // 每次构建/启动前同步 pyodide 本地资源
    "modules:done": () => {
      syncPyodide()
      if (!process.argv.includes('prepare')) return
      ensureFromExample('.env', '.env.example')
      ensureFromExample('ecosystem.config.cjs', 'ecosystem.config.example.cjs')
    },
    // 生产构建：压缩 public 资源（阶段名见 @nuxt/nitro-server）
    "nitro:build:public-assets": (nitro: { options: { output: { publicDir: string } } }) => {
      precompressPublicAssets(nitro.options.output.publicDir)
    },
  },
  modules: [
    "./modules/base",
    "@nuxthub/core",
    "@nuxt/ui",
    "@nuxtjs/i18n",
    "@nuxt/test-utils/module"
  ],
  ui: { fonts: false },
  // 顶层 runtimeConfig：仅该域名（如 mxlms.oldmoon.cn）在首页做 Access Verification，
  // 其他访问（IP/localhost/其余域名）直接放行。
  // 放在 public 段（客户端需判断）：环境变量用 NUXT_PUBLIC_VERIFICATION_URL 覆盖。
  runtimeConfig: {
    public: {
      verificationUrl: '',
      // 重量级第三方库（Babylon / Univer+React / web-llm / three+three-vrm / ffmpeg core）不随仓库分发，
      // 默认走公网 CDN；内网部署时用环境变量指向本地镜像即可完全脱网：
      //   NUXT_PUBLIC_NPM_ASSETS_BASE  镜像 jsdelivr 的 npm 路径布局，默认 https://cdn.jsdelivr.net/npm
      //   NUXT_PUBLIC_ESM_ASSETS_BASE  ESM 依赖基址（three / three-vrm / web-llm），默认 https://esm.sh
      // 轻量依赖已由 scripts/copy-vendor-assets.mjs 落到 public/vendor（同源，不需要配置）。
      npmAssetsBase: 'https://cdn.jsdelivr.net/npm',
      esmAssetsBase: 'https://esm.sh',
    },
    // PeerTube 视频上传（ueditor 视频走 PeerTube，插入 embed iframe）。
    // 配置主来源：系统设置 → 存储（site:peertube.*，写入 configs 表）；
    // 这里仅作 env 兜底（NUXT_PEERTUBE_URL 等），系统设置留空时才生效。
    // 未配置（url/username/password 任一为空）时，ueditor 视频上传回退为普通文件上传方式。
    peertube: {
      url: '',
      username: '',
      password: '',
      privacy: '1',
      channelId: '1',
      // 视频大小上限（MB），用 NUXT_PEERTUBE_MAX_SIZE_MB 覆盖，默认 2GB
      maxSizeMB: 2048,
    },
    // 监控页 /monitor：PM2 ecosystem 配置文件路径与日志目录
    // 可用 NUXT_MONITOR_ECOSYSTEM_CONFIG / NUXT_MONITOR_LOG_DIR / NUXT_MONITOR_VIEW_PASSWORD 覆盖
    monitor: {
      ecosystemConfig: '',
      logDir: '',
      // 监控查看密码（留空则无需密码）
      viewPassword: 'REDACTED',
    },
  },
  vite: {
    server: {
      // 允许指定域名
      allowedHosts: [
        // 本地调试可保留
        "localhost",
        "127.0.0.1",
      ],
    },
  },
});
