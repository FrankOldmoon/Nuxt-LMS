import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

const SALT_LENGTH = 16
const KEY_LENGTH = 64

/** 密码哈希（与 seed.ts 保持一致：salt:derivedKey 格式） */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH).toString('hex')
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (err, key) => {
      if (err) reject(err)
      else resolve(key)
    })
  })
  return `${salt}:${derivedKey.toString('hex')}`
}

/** 验证密码（恒定时间比较，防计时侧信道） */
export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  const [salt, key] = hashed.split(':')
  if (!salt || !key) return false
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (err, k) => {
      if (err) reject(err)
      else resolve(k)
    })
  })
  const expected = Buffer.from(key, 'hex')
  // 长度不同时直接返回 false（timingSafeEqual 要求等长 Buffer）
  if (expected.length !== derivedKey.length) return false
  return timingSafeEqual(expected, derivedKey)
}

/** 生成随机 token */
export function generateToken(): string {
  return randomBytes(32).toString('hex')
}
