/**
 * 伪代码运行器：将伪代码转换为 Python，再用共享 Pyodide 运行。
 * 转换逻辑复用 runners/pseudocode 的 TS 源实现（基于 chevrotain，pnpm 已安装）。
 */
import { ref } from 'vue'
import type { Runner, RunContext } from './types'
import { getPyodide } from './pyodide'
import { psToPy, pyToPs } from './pseudocode/index'

export type Dialect = 'IGCSE' | 'ALEVEL'

/** 伪代码 → Python（供右侧预览框使用；语法错误时抛出异常） */
export function pseudocodeToPython(code: string, dialect: Dialect = 'IGCSE'): string {
    return psToPy(code, dialect)
}

/** Python → 伪代码（供右侧编辑 Python 后转回左侧使用；语法错误时抛出异常） */
export function pythonToPseudocode(code: string, dialect: Dialect = 'IGCSE'): string {
    return pyToPs(code, dialect)
}

export function createPseudocodeRunner(): Runner {
    const ready = ref(false)
    const loadingLabel = 'Loading Pseudocode...'
    let pyodide: any = null
    let pyodideReady = false

    async function init(): Promise<void> {
        if (ready.value) return
        pyodide = await getPyodide()
        pyodideReady = true
        ready.value = true
    }

    async function run(ctx: RunContext): Promise<void> {
        if (!pyodideReady) await init()

        let pythonCode: string
        try {
            pythonCode = psToPy(ctx.code, 'IGCSE')
        } catch (e: any) {
            ctx.onOutput(`\nPseudocode parse error: ${e.message || e}\n`)
            return
        }

        pyodide.setStdout({ batched: (text: string) => ctx.onOutput(text + '\n') })
        pyodide.setStderr({ batched: (text: string) => ctx.onOutput(text + '\n') })

        const inputLines = ctx.input.split('\n')
        let inputIndex = 0
        pyodide.setStdin({
            stdin: () => {
                if (inputIndex < inputLines.length) {
                    return inputLines[inputIndex++]
                }
                return null
            },
        })

        try {
            await pyodide.runPythonAsync(pythonCode)
        } catch (e: any) {
            ctx.onOutput(`\n${e.message || e}\n`)
        }
    }

    return { name: 'pseudocode', ready, loadingLabel, init, run }
}