// https://nuxt.com/docs/api/configuration/nuxt-config
// npx nuxt db generate
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: [
    "@nuxthub/core",
    "@nuxt/ui",
    "@nuxtjs/i18n",
    "@nuxt/test-utils/module",
    "./modules/base",
    "./modules/doc",
    "./modules/lms",
  ],
  i18n: {
    strategy: "no_prefix",
    locales: [
      { code: "en", iso: "en-US", name: "English", file: "en.json" },
    ],
    defaultLocale: "en",
  },
  hub: {
    db: "postgresql",
  },
  runtimeConfig: {
    public: {
      moduleBase: false,
      moduleDoc: false,
      moduleLms: false,
    },
  },
  css: ["~/assets/css/main.css"],
  ui: {
    fonts: false,
  },
  nitro: {
    scheduledTasks: {
      "build-search": { cron: "0 0 * * *" },
    },
    experimental: {
      openAPI: true,
      tasks: true,
      websocket: true,
    },
    routeRules: {
      "/api/**": {
        cors: true,
      },
    },
  },
});