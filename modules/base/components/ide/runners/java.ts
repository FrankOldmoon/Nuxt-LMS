import { ref } from 'vue'
import type { Runner, RunContext } from './types'

const CHEERPJ_LOADER = 'https://cjrtnc.leaningtech.com/4.3/loader.js'

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

/** 从用户代码中提取首个类名（约定为入口类）；提取失败回退 Main */
function extractClassName(code: string): string {
    const m = code.match(/(?:public\s+|abstract\s+|final\s+)*class\s+([A-Za-z_]\w*)/)
    return m ? m[1] : 'Main'
}

/** 生成 _Runner 包装类：重定向 stdin 自文件、编译用户类、反射调用 main */
function buildRunnerSource(className: string): string {
    return [
        'import java.io.*;',
        'import java.lang.reflect.*;',
        'public class _Runner {',
        '  public static void main(String[] args) throws Exception {',
        '    try { System.setIn(new FileInputStream("/app/_in.txt")); } catch (Exception e) {}',
        '    javax.tools.JavaCompiler c = javax.tools.ToolProvider.getSystemJavaCompiler();',
        `    int code = c.run(null, System.out, System.err, "${className}.java");`,
        '    if (code != 0) return;',
        `    Class<?> cls = Class.forName("${className}");`,
        '    Method m = cls.getMethod("main", String[].class);',
        '    m.invoke(null, (Object) new String[0]);',
        '  }',
        '}',
        '',
    ].join('\n')
}

export function createJavaRunner(): Runner {
    const ready = ref(false)
    const loadingLabel = 'Loading Java runtime (first load ~10MB)...'

    async function init(): Promise<void> {
        if (ready.value) return
        await loadScript(CHEERPJ_LOADER)
        await (window as any).cheerpjInit({ status: 'none' })
        ready.value = true
    }

    async function run(ctx: RunContext): Promise<void> {
        const w = window as any
        if (!w.cheerpjInit) await init()

        const className = extractClassName(ctx.code)
        const runnerSrc = buildRunnerSource(className)

        // 写入虚拟文件系统
        w.cheerpOSAddStringFile(`/app/${className}.java`, ctx.code)
        w.cheerpOSAddStringFile('/app/_Runner.java', runnerSrc)
        w.cheerpOSAddStringFile('/app/_in.txt', ctx.input || '')

        // 劫持 console 捕获 System.out/System.err（CheerpJ 默认输出到浏览器 console）
        const origLog = console.log
        const origErr = console.error
        const origWarn = console.warn
        const hijack = () => (...a: any[]) => {
            ctx.onOutput(a.map((x) => (typeof x === 'string' ? x : String(x))).join(' ') + '\n')
        }
        console.log = hijack() as any
        console.error = hijack() as any
        console.warn = hijack() as any

        try {
            // 1. 编译 _Runner（包装类，几乎不会失败）
            await w.cheerpjRunMain('com.sun.tools.javac.Main', '/app', '_Runner.java')
            // 2. 运行 _Runner：内部编译用户类并反射调用 main
            await w.cheerpjRunMain('_Runner', '/app')
        } catch (e: any) {
            ctx.onOutput(`\n${e.message || e}\n`)
        } finally {
            console.log = origLog
            console.error = origErr
            console.warn = origWarn
        }
    }

    return { name: 'java', ready, loadingLabel, init, run }
}
