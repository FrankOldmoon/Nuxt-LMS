import { ref } from 'vue'
import type { Runner, RunContext } from './types'
import { getPyodide } from './pyodide'

export function createPythonRunner(): Runner {
    const ready = ref(false)
    const loadingLabel = 'Loading Python...'
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
            await pyodide.runPythonAsync(ctx.code)
        } catch (e: any) {
            ctx.onOutput(`\n${e.message || e}\n`)
        }
    }

    return { name: 'python', ready, loadingLabel, init, run }
}
