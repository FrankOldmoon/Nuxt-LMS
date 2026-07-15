import { randomBytes, scrypt } from 'node:crypto'

const SALT_LENGTH = 16
const KEY_LENGTH = 64

/** Password hash (consistent with seed.ts: salt:derivedKey format) */
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

/** Verify password */
export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  const [salt, key] = hashed.split(':')
  if (!salt || !key) return false
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (err, k) => {
      if (err) reject(err)
      else resolve(k)
    })
  })
  return key === derivedKey.toString('hex')
}

/** Generate random token */
export function generateToken(): string {
  return randomBytes(32).toString('hex')
}
