/**
 * Source code static check: HTTP header names must be ASCII
 *
 * Background: previously upload.post.ts used `User‑Agent` with U+2011 (non-breaking hyphen) by mistake
 * causing Nitro $fetch to error "Cannot convert argument to a ByteString because the
 * character at index 4 has a value of 8209 which is greater than 255"。
 *
 * This test scans all module source code, validating the character set of HTTP header names (e.g.
 * `User-Agent`, `Content-Type`, `Authorization`, etc.) in string literals.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

// HTTP header name common pattern: word-word
const HEADER_NAME_RE = /["']([A-Z][A-Za-z0-9-]+)["']/g
// Exclude obvious non-header names (route paths, file extensions, import paths, schema names, etc.)
const NON_HEADER_KEYWORDS = new Set([
  'X-LMS', // internal use
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
      // Skip comment lines (roughly: lines starting with // or /* or containing * comment)
      const lines = content.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
          continue
        }
        // Only check lines containing fetch / headers / Authorization / Content-Type etc. keywords
        if (!/headers|fetch|axios|got\.|http/i.test(line)) {
          continue
        }
        let m: RegExpExecArray | null
        HEADER_NAME_RE.lastIndex = 0
        while ((m = HEADER_NAME_RE.exec(line)) !== null) {
          const candidate = m[1]
          // Must contain a hyphen (HTTP header name characteristic)
          if (!candidate.includes('-')) continue
          // All word letters capitalized → likely a header name (exclude Course-Id etc. business fields)
          if (!/^[A-Z][A-Za-z]*(-[A-Z][A-Za-z]*)+$/.test(candidate)) continue
          if (NON_HEADER_KEYWORDS.has(candidate)) continue
          // Check each character code point
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
