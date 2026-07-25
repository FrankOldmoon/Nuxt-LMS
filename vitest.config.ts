import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath } from "node:url";

export default defineConfig({
  define: {
    // Nuxt 编译时常量，composable 测试中视为客户端
    "import.meta.client": "true",
  },
  plugins: [vue()],
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: [
            "test/unit/*.{test,spec}.ts",
            "modules/*/test/unit/*.{test,spec}.ts",
            "modules/*/test/api/*.{test,spec}.ts",
          ],
          environment: "node",
          // 共享 setup：把 Nitro/Nuxt/composable auto-imports stub 暴露到 globalThis
          setupFiles: ["./test/setup/unit-shared.ts"],
        },
      },
      {
        test: {
          name: "composables",
          // composable 测试：stub Nuxt auto-imports，用 happy-dom 提供 DOM API
          include: [
            "modules/*/test/composables/*.{test,spec}.ts",
          ],
          environment: "happy-dom",
          setupFiles: ["./test/setup/nuxt-stubs.ts"],
        },
      },
      {
        test: {
          name: "components",
          // 组件测试：用 happy-dom + @vue/test-utils
          include: ["modules/*/test/components/**/*.{test,spec}.ts"],
          environment: "happy-dom",
          setupFiles: ["./test/setup/nuxt-stubs.ts"],
        },
        // 在 project 内部添加 vue plugin 以解析 .vue 文件
        plugins: [vue()],
        resolve: {
          alias: {
            // pretty-bytes 是 file.vue 的直接依赖，但 pnpm 未提升到顶层 node_modules；
            // vi.mock 无法拦截 .vue 文件内 Vite import-analysis 阶段的解析，故用 alias 桩
            "pretty-bytes": fileURLToPath(
              new URL("./test/setup/pretty-bytes-stub.ts", import.meta.url),
            ),
          },
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
