/**
 * 解析 LMS 生产库连接串
 *
 * 为什么不按「有没有 # 注释」判断：
 *   .env 里那两行会被随手调换（有人把生产串挪到未注释行、或反过来），
 *   按注释状态判断会**静默连到本地库**，写错数据还看不出来。
 *   这里按**地址**判断：包含 10.28.1.151 的才是生产库。
 *
 * 用法：
 *   import { prodUrl } from './_prod-url.mjs'
 *   const sql = postgres(prodUrl)
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

/** 读取 .env（可用 LMS_ENV_FILE 覆盖路径） */
export function readEnv() {
  const file = process.env.LMS_ENV_FILE || resolve(here, '../.env')
  return readFileSync(file, 'utf8')
}

/** 生产库连接串（找不到就抛错，绝不退回本地库） */
export function getProdUrl() {
  const env = readEnv()
  const line = env
    .split('\n')
    .map((l) => l.replace(/^#\s*/, '').trim())
    .find((l) => l.startsWith('POSTGRES_URL=') && l.includes('10.28.1.151'))
  if (!line) {
    throw new Error(
      '找不到生产库连接串：.env 里需要一行 POSTGRES_URL=... 且地址含 10.28.1.151',
    )
  }
  return line.replace(/^POSTGRES_URL=/, '').trim()
}

/** 本地库连接串（.env 里不含 10.28.1.151 的那行） */
export function getLocalUrl() {
  const env = readEnv()
  const line = env
    .split('\n')
    .map((l) => l.replace(/^#\s*/, '').trim())
    .find((l) => l.startsWith('POSTGRES_URL=') && !l.includes('10.28.1.151'))
  return line ? line.replace(/^POSTGRES_URL=/, '').trim() : ''
}
