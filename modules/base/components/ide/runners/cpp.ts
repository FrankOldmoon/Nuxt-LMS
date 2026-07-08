import { ref } from 'vue'
import type { Runner, RunContext } from './types'

// JSCPP（C++ 解释器）CDN：esm.sh（主）→ esm.run（备）
// 注意：npm 包名是 JSCPP（大写），版本 2.0.9，不是 jscpp@3.0.1
// esm.sh 将 CommonJS 转为 ESM，导出 { default: { run, includes } }
const JSCPP_CDN_PRIMARY = 'https://esm.sh/JSCPP@2.0.9'
const JSCPP_CDN_FALLBACK = 'https://esm.run/JSCPP@2.0.9'

let jscppModule: any = null

async function loadJSCPP(): Promise<any> {
    if (jscppModule) return jscppModule
    try {
        console.log('[CppRunner] Loading JSCPP from esm.sh...')
        jscppModule = await import(/* @vite-ignore */ JSCPP_CDN_PRIMARY)
        console.log('[CppRunner] JSCPP loaded from esm.sh')
    } catch (e) {
        console.warn('[CppRunner] esm.sh failed, trying esm.run...', e)
        jscppModule = await import(/* @vite-ignore */ JSCPP_CDN_FALLBACK)
        console.log('[CppRunner] JSCPP loaded from esm.run')
    }
    return jscppModule
}

export function createCppRunner(): Runner {
    const ready = ref(false)
    const loadingLabel = 'Loading C++...'

    async function init(): Promise<void> {
        if (ready.value) return
        await loadJSCPP()
        ready.value = true
    }

    async function run(ctx: RunContext): Promise<void> {
        if (!jscppModule) await init()

        // esm.sh 导出 { default: { run, includes } }；兼容直接命名导出 run 的情况
        const JSCPP = jscppModule.default || jscppModule
        const runFn = JSCPP?.run || jscppModule.run
        if (typeof runFn !== 'function') {
            ctx.onOutput(`\n[Error] JSCPP.run not found. Module keys: ${Object.keys(jscppModule)}\n`)
            return
        }

        const inputLines = ctx.input.split('\n')
        let lineIdx = 0

        try {
            runFn(ctx.code, ctx.input, {
                stdio: {
                    write: (s: string) => ctx.onOutput(s),
                    drain: () => (lineIdx < inputLines.length ? inputLines[lineIdx++] + '\n' : null),
                },
            })
        } catch (e: any) {
            ctx.onOutput(`\n${e.message || e}\n`)
        }
    }

    return { name: 'cpp', ready, loadingLabel, init, run }
}
