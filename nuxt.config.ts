// https://nuxt.com/docs/api/configuration/nuxt-config
// npx nuxt db generate
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxthub/core", '@nuxt/ui', '@nuxtjs/i18n'],
  i18n: {
    strategy: 'no_prefix',
    locales: [
      { code: 'en', iso: 'en-US', name: 'English', file: 'en.json'},
      { code: 'zh-CN', iso: 'zh-CN', name: '简体中文', file: 'zh-CN.json'},
      { code: 'zh-TW', iso: 'zh-TW', name: '繁體中文', file: 'zh-TW.json'},
    ],
    defaultLocale: 'en'
  },
  hub: {
    db: "postgresql",
    blob: true,
  },
  css: ['~/assets/css/main.css'],
  ui: {
    fonts: false
  },
  nitro: {
    
    experimental: {
      openAPI: true,
      tasks: true,
    },
    routeRules: {
      // 全部接口允许跨域
      "/api/**": {
        cors: true,
      },
    }
  },
});