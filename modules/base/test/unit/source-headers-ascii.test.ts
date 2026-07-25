/**
 * 源码静态校验：HTTP 头名必须为 ASCII
 *
 * 背景：之前 upload.post.ts 中 `User‑Agent` 误用 U+2011（非断开连字符）
 * 导致 Nitro $fetch 报错 "Cannot convert argument to a ByteString because the
 * character at index 4 has a value of 8209 which is greater than 255"。
 *
 * 此测试扫描所有模块源码，校验字符串字面量中 HTTP 头名（如
 * `User-Agent`、`Content-Type`、`Authorization` 等）的字符集。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

// HTTP 头名常见形式：单词-单词
const HEADER_NAME_RE = /["']([A-Z][A-Za-z0-9-]+)["']/g
// 排除明显不是头名的情况（路由 path、文件后缀、import 路径、schema 名等）
const NON_HEADER_KEYWORDS = new Set([
  'X-LMS', // 内部用
])

function listModuleFiles(): string[] {
  try {
    const out = execSync(
      `find /Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/modules -type f \\( -name "*.ts" -o -name "*.vue" -o -name "*.js" \\) -not -path "*/node_modules/*" -not -path "*/test/*" -not -path "*/.nuxt/*" -not -path "*/dist/*"`,
      { encoding: 'utf8' }
    )
    return out.trim().split('\n').filter(Boolean)
  } catch {
    return []
  }
}

describe('源码静态校验：HTTP 头名 ASCII', () => {
  it('所有 .ts/.vue/.js 中的 HTTP 头名字符均为 ASCII', () => {
    const files = listModuleFiles()
    expect(files.length).toBeGreaterThan(0)
    const violations: Array<{ file: string; header: string; codePoint: number; index: number }> = []

    for (const file of files) {
      let content: string
      try {
        content = readFileSync(file, 'utf8')
      } catch {
        continue
      }
      // 跳过注释行（粗略：用 // 或 /* 开头或包含 * 注释的行）
      const lines = content.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
          continue
        }
        // 仅检查包含 fetch / headers / Authorization / Content-Type 等关键字的行
        if (!/headers|fetch|axios|got\.|http/i.test(line)) {
          continue
        }
        let m: RegExpExecArray | null
        HEADER_NAME_RE.lastIndex = 0
        while ((m = HEADER_NAME_RE.exec(line)) !== null) {
          const candidate = m[1]
          // 必须含连字符（HTTP 头名特征）
          if (!candidate.includes('-')) continue
          // 全部单词字母大写开头 → 可能是头名（排除 Course-Id 等业务字段）
          if (!/^[A-Z][A-Za-z]*(-[A-Z][A-Za-z]*)+$/.test(candidate)) continue
          if (NON_HEADER_KEYWORDS.has(candidate)) continue
          // 检查每个字符 code point
          for (let i = 0; i < candidate.length; i++) {
            if (candidate.charCodeAt(i) > 127) {
              violations.push({
                file,
                header: candidate,
                codePoint: candidate.charCodeAt(i),
                index: i,
              })
            }
          }
        }
      }
    }

    if (violations.length > 0) {
      const msg = violations
        .map(v => `${v.file}: header="${v.header}" index=${v.index} char=${v.codePoint} (0x${v.codePoint.toString(16)})`)
        .join('\n')
      throw new Error(`发现非 ASCII HTTP 头名：\n${msg}`)
    }
    expect(violations).toEqual([])
  })
})
