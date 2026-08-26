import type { Ref } from 'vue'

export type LanguageId = 'python' | 'javascript' | 'cpp' | 'java' | 'pseudocode' | 'sql'

export interface RunContext {
    code: string
    input: string
    onOutput: (text: string) => void
    /** 可选：结构化结果（如 SQL 查询的多张结果表），供 UI 直接渲染 */
    onResults?: (tables: SqlResultTable[]) => void
    /** 可选：执行错误（如 SQL 语法/运行时错误），供 UI 在结果区展示 */
    onError?: (message: string) => void
}

export interface SqlResultTable {
    columns: string[]
    rows: any[][]
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
        case 'pseudocode': return 'plaintext'
        case 'sql': return 'sql'
    }
}
