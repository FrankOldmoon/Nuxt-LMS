import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    // Nuxt 编译时常量，composable 测试中视为客户端
    "import.meta.client": "true",
  },
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: [
            "test/unit/*.{test,spec}.ts",
            "modules/*/test/unit/*.{test,spec}.ts",
          ],
          environment: "node",
        },
      },
      {
        test: {
          name: "composables",
          // composable 测试：stub Nuxt auto-imports，用 happy-dom 提供 DOM API
          include: ["modules/*/test/composables/*.{test,spec}.ts"],
          environment: "happy-dom",
          setupFiles: ["./test/setup/nuxt-stubs.ts"],
        },
      },
      {
        test: {
          name: "e2e",
          include: [
            "test/e2e/*.{test,spec}.ts",
            "test/nuxt/*.{test,spec}.ts",
            "modules/*/test/e2e/*.{test,spec}.ts",
            "modules/*/test/nuxt/*.{test,spec}.ts",
          ],
          environment: "node",
          // Nuxt 启动（含 fontless 字体元数据联网）+ 浏览器启动较慢，需放宽超时
          hookTimeout: 600000,
          testTimeout: 120000,
          // @nuxt/test-utils 含 import('bun:test')（仅 Bun 运行时调用），
          // Vite transform 阶段无法解析该 built-in，需 external 让 Node 直接 require
          server: { deps: { external: [/^@nuxt\/test-utils/] } },
        },
      },
    ],
  },
});
