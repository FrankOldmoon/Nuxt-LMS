/**
 * SQL 运行器：通过 sql.js（WASM 版，CDN 加载）在浏览器中执行 SQL。
 * 查询结果通过 onResults 以“多张表”的结构化形式回传，供 UI 以表格渲染。
 */
import { ref } from 'vue'
import type { Runner, RunContext, SqlResultTable } from './types'
import { loadScript } from './loadScript'

const SQL_CDN = 'https://sql.js.org/dist/'

let initSqlJsPromise: Promise<any> | null = null

function getInitSqlJs(): Promise<any> {
    if (initSqlJsPromise) return initSqlJsPromise
    initSqlJsPromise = (async () => {
        if (!(window as any).initSqlJs) {
            await loadScript(SQL_CDN + 'sql-wasm.js')
        }
        const initSqlJs = (window as any).initSqlJs
        if (typeof initSqlJs !== 'function') {
            throw new Error('initSqlJs is not defined after loading sql-wasm.js')
        }
        return initSqlJs({ locateFile: (file: string) => SQL_CDN + file })
    })()
    initSqlJsPromise.catch(() => { initSqlJsPromise = null })
    return initSqlJsPromise
}

/** 将 sql.js exec 的原始结果转换为结构化表格 */
function toTables(results: any[]): SqlResultTable[] {
    return results
        .filter((r) => r && Array.isArray(r.columns) && Array.isArray(r.values))
        .map((r) => ({
            columns: r.columns as string[],
            rows: r.values as any[][],
        }))
}

export function createSqlRunner(): Runner {
    const ready = ref(false)
    const loadingLabel = 'Loading SQL...'
    let db: any = null

    async function init(): Promise<void> {
        if (ready.value) return
        const initSqlJs = await getInitSqlJs()
        db = new initSqlJs.Database()
        ready.value = true
    }

    async function run(ctx: RunContext): Promise<void> {
        if (!db) await init()
        const sql = ctx.code.trim()
        if (!sql) {
            if (ctx.onResults) ctx.onResults([])
            if (ctx.onError) ctx.onError('No SQL provided.')
            ctx.onOutput('No SQL provided.\n')
            return
        }
        try {
            const results = db.exec(sql)
            const tables = toTables(results)
            if (ctx.onResults) ctx.onResults(tables)
            if (tables.length === 0) {
                // 无返回结果集（CREATE / INSERT / UPDATE 等）
                ctx.onOutput('Statement executed successfully.\n')
            }
        } catch (e: any) {
            const msg = `SQL error: ${e.message || e}`
            if (ctx.onError) ctx.onError(msg)
            ctx.onOutput(`\n${msg}\n`)
        }
    }

    return { name: 'sql', ready, loadingLabel, init, run }
}