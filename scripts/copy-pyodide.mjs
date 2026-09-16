/**
 * 将 pyodide npm 包的部分运行时资源复制到 public/pyodide，
 * 供浏览器通过本地 URL 加载（不再走 CDN）。
 *
 * 通过 .version 标记判断是否需要更新：仅当 pyodide 版本变化时才重新复制。
 * 用法：
 *   node scripts/copy-pyodide.mjs
 */
import { existsSync, readFileSync, writeFileSync, cpSync, rmSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'node_modules', 'pyodide')
const dest = join(root, 'public', 'pyodide')
const marker = join(dest, '.version')

if (!existsSync(src)) {
  // node_modules 未就绪时不报错（例如 postinstall 之前的阶段）
  console.warn('[copy-pyodide] node_modules/pyodide 不存在，跳过')
  process.exit(0)
}

try {
  const pkg = JSON.parse(readFileSync(join(src, 'package.json'), 'utf8'))
  const version = pkg.version || 'unknown'

  // 已同步且版本一致 → 跳过（避免每次启动都复制 13MB）
  if (existsSync(marker) && readFileSync(marker, 'utf8') === version) {
    process.exit(0)
  }

  rmSync(dest, { recursive: true, force: true })
  mkdirSync(dest, { recursive: true })
  // 只复制浏览器运行所需的资源，跳过 README/类型声明等
  for (const f of [
    'pyodide.js', 'pyodide.mjs', 'pyodide.asm.js', 'pyodide.asm.wasm',
    'python_stdlib.zip', 'pyodide-lock.json',
  ]) {
    const p = join(src, f)
    if (existsSync(p)) cpSync(p, join(dest, f))
  }
  writeFileSync(marker, version)
  console.log(`[copy-pyodide] 已复制 pyodide@${version} 到 public/pyodide`)
} catch (e) {
  console.error('[copy-pyodide] 复制失败:', e)
  process.exit(1)
}