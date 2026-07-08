import { ref } from 'vue'
import type { Runner, RunContext } from './types'

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/'

function loadScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if ((document as any).querySelector(`script[src="${url}"]`)) {
            resolve()
            return
        }
        const script = document.createElement('script')
        script.src = url
        script.onload = () => resolve()
        script.onerror = () => reject(new Error(`Failed to load ${url}`))
        document.head.appendChild(script)
    })
}

export function createPythonRunner(): Runner {
    const ready = ref(false)
    const loadingLabel = 'Loading Python...'
    let pyodide: any = null

    async function init(): Promise<void> {
        if (ready.value) return
        if (!(window as any).loadPyodide) {
            await loadScript(PYODIDE_CDN + 'pyodide.js')
        }
        pyodide = await (window as any).loadPyodide({ indexURL: PYODIDE_CDN })
        ready.value = true
    }

    async function run(ctx: RunContext): Promise<void> {
        if (!pyodide) await init()
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
