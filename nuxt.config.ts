// https://nuxt.com/docs/api/configuration/nuxt-config
// npx nuxt db generate
//
// 基础配置（i18n / hub / ui / nitro / css / runtimeConfig / appConfig）
// 已移至 ./modules/base/index.ts，由 base 模块在第三方模块 setup 前设置。
// base 必须排在 @nuxthub/core / @nuxt/ui / @nuxtjs/i18n 之前。
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: [
    "./modules/base",
    "@nuxthub/core",
    "@nuxt/ui",
    "@nuxtjs/i18n",
    "@nuxt/test-utils/module",
    "./modules/doc",
    "./modules/lms",
  ],
  ui:{fonts:false}
});
