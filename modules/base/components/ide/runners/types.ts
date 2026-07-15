import type { Ref } from 'vue'

export type LanguageId = 'python' | 'javascript' | 'cpp' | 'java'

export interface RunContext {
    code: string
    input: string
    onOutput: (text: string) => void
}

export interface Runner {
    name: LanguageId
    ready: Ref<boolean>
    loadingLabel: string
    /** Load runtime (CDN/WASM), idempotent and can be called repeatedly */
    init: () => Promise<void>
    /** Run code, stream output back via onOutput */
    run: (ctx: RunContext) => Promise<void>
    /** Cleanup on component unmount (Worker, virtual files, etc.) */
    cleanup?: () => void
}

export type RunnerFactory = () => Runner

/** Monaco editor language identifier */
export function monacoLang(lang: LanguageId): string {
    switch (lang) {
        case 'python': return 'python'
        case 'javascript': return 'javascript'
        case 'cpp': return 'cpp'
        case 'java': return 'java'
    }
}
