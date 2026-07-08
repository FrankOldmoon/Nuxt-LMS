import { ref } from "vue";
import type { Runner, RunContext } from "./types";

// 官方 JSCPP CDN 列表（按优先级尝试）
// 1) felixhao28.github.io —— 官方仓库 Pages（最权威）
// 2) cdn.jsdelivr.net/npm/JSCPP —— 主流 CDN，network 受限时通常仍可达
// 该 URL 同时承担两个职责：
//   1) 以 <script> 标签加载，暴露全局 JSCPP.WebWorkerHelper 类
//   2) 作为参数传入 WebWorkerHelper 构造器，用于派生真正的 Worker
const JSCPP_CDN_CANDIDATES = ["/JSCPP.es5.min.js"];

let jscppUrl: string | null = null; // 实际加载成功的 URL（同时用于 Worker 派生）

/**
 * 通过 <script> 标签按优先级顺序加载 JSCPP，遇到失败自动 fallback
 * 失败原因通常是：CDN 被网络代理拦截、ad-blocker、DNS 污染等
 */
async function loadJSCPP(): Promise<string> {
  if (jscppUrl) return jscppUrl;
  if (typeof document === "undefined") {
    // SSR 环境跳过加载
    throw new Error("JSCPP can only be loaded in a browser environment");
  }
  const errors: string[] = [];
  for (const url of JSCPP_CDN_CANDIDATES) {
    // 已经注入过就直接复用
    if (document.querySelector(`script[src="${url}"]`)) {
      jscppUrl = url;
      return url;
    }
    try {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = url;
        script.async = true;
        script.crossOrigin = "anonymous"; // 显式声明 CORS，避免浏览器静默吞错
        const timeout = setTimeout(
          () => reject(new Error(`Timeout loading ${url}`)),
          30000,
        );
        script.onload = () => {
          clearTimeout(timeout);
          resolve();
        };
        script.onerror = () => {
          clearTimeout(timeout);
          reject(new Error(`Network error for ${url}`));
        };
        document.head.appendChild(script);
      });
      jscppUrl = url;
      return url;
    } catch (e: any) {
      errors.push(e?.message || String(e));
    }
  }
  throw new Error(
    `Failed to load JSCPP from any CDN. Tried: ${JSCPP_CDN_CANDIDATES.join(
      ", ",
    )}. Errors: ${errors.join(" | ")}`,
  );
}

export function createCppRunner(): Runner {
  const ready = ref(false);
  const loadingLabel = "Loading C++ Runtime...";

  async function init(): Promise<void> {
    if (ready.value) return;
    await loadJSCPP();
    ready.value = !!(window as any).JSCPP?.WebWorkerHelper;
  }

  async function run(ctx: RunContext): Promise<void> {
    const JSCPP = (window as any).JSCPP;
    if (!JSCPP?.WebWorkerHelper) {
      ctx.onOutput(
        "\n[Error] JSCPP WebWorkerHelper not available. Runtime not loaded.\n",
      );
      return;
    }

    // 必须用与 <script> 加载时完全一致的 URL，
    // 这样 Worker 才能 fetch 到同一份脚本（CORS 头一致）
    const workerScriptUrl = jscppUrl || JSCPP_CDN_CANDIDATES[0];
    const helper = new JSCPP.WebWorkerHelper(workerScriptUrl);

    await new Promise<void>((resolve) => {
      helper.run(
        ctx.code,
        ctx.input,
        {
          stdio: {
            write: (s: string) => ctx.onOutput(s),
          },
        },
        (err: any, returnCode: number) => {
          if (err) {
            ctx.onOutput(`\nRuntime Error: ${err.message || err}\n`);
          } else {
            ctx.onOutput(`\nProgram exited with code ${returnCode}\n`);
          }
          // 终止 Worker，释放资源（官方示例：helper.worker.terminate()）
          if (helper.worker) {
            helper.worker.terminate();
          }
          resolve();
        },
      );
    });
  }

  function cleanup() {
    // 无持久 Worker，无需额外清理
  }

  return { name: "cpp", ready, loadingLabel, init, run, cleanup };
}
