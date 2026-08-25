// https://nuxt.com/docs/api/configuration/nuxt-config
// npx nuxt db generate
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: [
    "./modules/base",
    "@nuxthub/core",
    "@nuxt/ui",
    "@nuxtjs/i18n",
    "@nuxt/test-utils/module"
  ],
  ui: { fonts: false },
  vite: {
    server: {
      // 允许指定域名
      allowedHosts: [
        "mxlms.oldmoon.cn",
        // 本地调试可保留
        "localhost",
        "127.0.0.1",
      ],
    },
  },
});
