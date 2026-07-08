import { ref } from 'vue'
import type { Runner, RunContext } from './types'

const RUN_TIMEOUT_MS = 5000

const workerSrc = `
self.onmessage = (e) => {
  const hijack = () => (...a) => { self.postMessage({ type: 'out', text: a.map(String).join(' ') + '\\n' }) }
  console.log = console.error = console.warn = console.info = hijack()
  try {
    const input = e.data.input || ''
    let lineIdx = 0
    const allLines = input.split('\\n')
    const readLine = () => (lineIdx < allLines.length ? allLines[lineIdx++] : '')
    const fn = new Function('input', 'readLine', e.data.code)
    const r = fn(input, readLine)
    if (r !== undefined) self.postMessage({ type: 'out', text: String(r) + '\\n' })
    self.postMessage({ type: 'done' })
  } catch (err) {
    self.postMessage({ type: 'out', text: ((err && err.stack) || err) + '\\n' })
    self.postMessage({ type: 'done' })
  }
}
`

export function createJavascriptRunner(): Runner {
    const ready = ref(true)
    const loadingLabel = ''
    let worker: Worker | null = null

    async function init(): Promise<void> {
        ready.value = true
    }

    async function run(ctx: RunContext): Promise<void> {
        await new Promise<void>((resolve) => {
            const blob = new Blob([workerSrc], { type: 'text/javascript' })
            worker = new Worker(URL.createObjectURL(blob))
            let settled = false

            const timer = setTimeout(() => {
                if (settled) return
                settled = true
                ctx.onOutput('\n[Execution timed out]\n')
                worker?.terminate()
                worker = null
                resolve()
            }, RUN_TIMEOUT_MS)

            worker.onmessage = (ev: MessageEvent) => {
                const data = ev.data
                if (data.type === 'out') {
                    ctx.onOutput(data.text)
                } else if (data.type === 'done') {
                    if (settled) return
                    settled = true
                    clearTimeout(timer)
                    worker?.terminate()
                    worker = null
                    resolve()
                }
            }
            worker.onerror = (err) => {
                if (settled) return
                settled = true
                clearTimeout(timer)
                ctx.onOutput(`\n[Worker error] ${err.message || err}\n`)
                worker?.terminate()
                worker = null
                resolve()
            }

            worker.postMessage({ code: ctx.code, input: ctx.input })
        })
    }

    function cleanup(): void {
        if (worker) {
            worker.terminate()
            worker = null
        }
    }

    return { name: 'javascript', ready, loadingLabel, init, run, cleanup }
}
