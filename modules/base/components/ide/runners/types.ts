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
    /** 加载运行时（CDN/WASM），幂等可重复调用 */
    init: () => Promise<void>
    /** 运行代码，通过 onOutput 流式回传输出 */
    run: (ctx: RunContext) => Promise<void>
    /** 组件卸载时清理（Worker、虚拟文件等） */
    cleanup?: () => void
}

export type RunnerFactory = () => Runner

/** Monaco 编辑器语言标识 */
export function monacoLang(lang: LanguageId): string {
    switch (lang) {
        case 'python': return 'python'
        case 'javascript': return 'javascript'
        case 'cpp': return 'cpp'
        case 'java': return 'java'
    }
}
