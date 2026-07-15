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
    "@nuxt/test-utils/module",
    "./modules/lms",
    "./modules/admin",
  ],
  ui: { fonts: false },
  vite: {
    server: {
      // Allow specific domains
      allowedHosts: [
        "mxlms.oldmoon.cn",
        // Keep for local debugging
        "localhost",
        "127.0.0.1",
      ],
    },
  },
});
