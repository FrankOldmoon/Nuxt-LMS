import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath } from "node:url";

export default defineConfig({
  define: {
    // Nuxt compile-time constant; treated as client in composable tests
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
          // Shared setup: expose Nitro/Nuxt/composable auto-import stubs to globalThis
          setupFiles: ["./test/setup/unit-shared.ts"],
        },
      },
      {
        test: {
          name: "composables",
          // Composable tests: stub Nuxt auto-imports; use happy-dom for the DOM API
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
          // Component tests: use happy-dom + @vue/test-utils
          include: ["modules/*/test/components/**/*.{test,spec}.ts"],
          environment: "happy-dom",
          setupFiles: ["./test/setup/nuxt-stubs.ts"],
        },
        // Add the vue plugin inside the project to resolve .vue files
        plugins: [vue()],
        resolve: {
          alias: {
            // pretty-bytes is a direct dependency of file.vue, but pnpm does not hoist it to the top-level node_modules;
            // vi.mock cannot intercept resolution during Vite's import-analysis phase inside .vue files, so use an alias stub
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
          // Nuxt startup (incl. fontless font-metadata network calls) + browser startup is slow; relax timeouts
          hookTimeout: 600000,
          testTimeout: 120000,
          // @nuxt/test-utils contains import('bun:test') (only invoked under the Bun runtime),
          // Vite's transform phase cannot resolve this built-in, so mark it external to let Node require it directly
          server: { deps: { external: [/^@nuxt\/test-utils/] } },
        },
      },
    ],
  },
});
