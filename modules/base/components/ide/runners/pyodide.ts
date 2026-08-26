/**
 * 共享的 Pyodide 运行时单例。
 * Python 运行器与伪代码运行器共用同一个 Pyodide 实例，避免重复下载/初始化。
 */
import { loadScript } from './loadScript'

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/'

let pyodideInstance: Promise<any> | null = null

function loadPyodide(): Promise<any> {
    if ((window as any).loadPyodide) {
        return Promise.resolve()
    }
    return loadScript(PYODIDE_CDN + 'pyodide.js').then(() => {
        if (!(window as any).loadPyodide) {
            throw new Error('loadPyodide is not defined after loading pyodide.js')
        }
    })
}

/** 获取共享的 Pyodide 实例（幂等） */
export function getPyodide(): Promise<any> {
    if (!pyodideInstance) {
        pyodideInstance = loadPyodide()
            .then(() => (window as any).loadPyodide({ indexURL: PYODIDE_CDN }))
            .catch((e) => {
                // 失败时清空缓存，允许下次重试
                pyodideInstance = null
                throw e
            })
    }
    return pyodideInstance
}