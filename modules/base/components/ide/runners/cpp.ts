import { ref } from "vue";
import type { Runner, RunContext } from "./types";

// Official JSCPP CDN list (tried in priority order)
// 1) felixhao28.github.io — Official repo Pages (most authoritative)
// 2) cdn.jsdelivr.net/npm/JSCPP — Mainstream CDN, usually reachable even under network restrictions
// This URL serves two purposes:
//   1) Loaded via <script> tag, exposes the global JSCPP.WebWorkerHelper class
//   2) Passed as parameter to WebWorkerHelper constructor to derive the actual Worker
const JSCPP_CDN_CANDIDATES = ["/JSCPP.es5.min.js"];

let jscppUrl: string | null = null; // The URL that actually loaded successfully (also used for Worker derivation)

/**
 * Load JSCPP via <script> tag in priority order, with automatic fallback on failure
 * Common failure reasons: CDN blocked by network proxy, ad-blocker, DNS pollution, etc.
 */
async function loadJSCPP(): Promise<string> {
  if (jscppUrl) return jscppUrl;
  if (typeof document === "undefined") {
    // Skip loading in SSR environment
    throw new Error("JSCPP can only be loaded in a browser environment");
  }
  const errors: string[] = [];
  for (const url of JSCPP_CDN_CANDIDATES) {
    // Reuse if already injected
    if (document.querySelector(`script[src="${url}"]`)) {
      jscppUrl = url;
      return url;
    }
    try {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = url;
        script.async = true;
        script.crossOrigin = "anonymous"; // Explicitly declare CORS to avoid browser silently swallowing errors
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

    // Must use the exact same URL as the <script> tag loading,
    // so the Worker can fetch the same script (consistent CORS headers)
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
          // Terminate Worker to release resources (official example: helper.worker.terminate())
          if (helper.worker) {
            helper.worker.terminate();
          }
          resolve();
        },
      );
    });
  }

  function cleanup() {
    // No persistent Worker, no additional cleanup needed
  }

  return { name: "cpp", ready, loadingLabel, init, run, cleanup };
}
