/**
 * 共享的 Pyodide 运行时单例。
 * Python 运行器与伪代码运行器共用同一个 Pyodide 实例，避免重复下载/初始化。
 *
 * 运行时资源来自 npm 包 pyodide（通过 scripts/copy-pyodide.mjs 同步到 public/pyodide），
 * 由浏览器以本地 URL 加载，不再走 CDN。
 */
import { loadScript } from './loadScript'

// 本地 pyodide 资源目录（Web 根路径），由 npm 包复制而来
const PYODIDE_BASE = '/pyodide/'

let pyodideInstance: Promise<any> | null = null

function loadPyodide(): Promise<void> {
    if ((window as any).loadPyodide) {
        return Promise.resolve()
    }
    return loadScript(PYODIDE_BASE + 'pyodide.js').then(() => {
        if (!(window as any).loadPyodide) {
            throw new Error('loadPyodide is not defined after loading pyodide.js')
        }
    })
}

/** 获取共享的 Pyodide 实例（幂等） */
export function getPyodide(): Promise<any> {
    if (!pyodideInstance) {
        pyodideInstance = loadPyodide()
            .then(() => (window as any).loadPyodide({ indexURL: PYODIDE_BASE }))
            .catch((e) => {
                // 失败时清空缓存，允许下次重试
                pyodideInstance = null
                throw e
            })
    }
    return pyodideInstance
}