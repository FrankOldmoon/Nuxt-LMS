// https://nuxt.com/docs/api/configuration/nuxt-config
// npx nuxt db generate
import { existsSync, copyFileSync } from 'node:fs'

// nuxt prepare（含 postinstall）时，若 .env / ecosystem.config.cjs 缺失，则从 example 复制生成
function ensureFromExample(file: string, example: string) {
  if (existsSync(file)) return
  if (!existsSync(example)) return
  copyFileSync(example, file)
  console.log(`[nuxt] generated ${file} from ${example}`)
}

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  hooks: {
    // 仅 nuxt prepare（含 postinstall 触发）时，若 .env / ecosystem.config.cjs 缺失则从 example 复制生成
    "modules:done": () => {
      if (!process.argv.includes('prepare')) return
      ensureFromExample('.env', '.env.example')
      ensureFromExample('ecosystem.config.cjs', 'ecosystem.config.example.cjs')
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
  // 其他访问（IP/localhost/其余域名）直接放行。环境变量 NUXT_VERIFICATION_URL 覆盖。
  runtimeConfig: {
    verificationUrl: '',
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
