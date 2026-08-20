/**
 * remoteImage - SSRF 防护 单元测试
 * @see modules/base/server/utils/files/remoteImage.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

describe('isPrivateAddress', () => {
  it('拒绝常见内网 IPv4', async () => {
    const { isPrivateAddress } = await import('../../server/utils/files/remoteImage')
    for (const ip of ['127.0.0.1', '10.0.0.1', '172.16.0.1', '172.31.255.255', '192.168.1.1', '0.0.0.0', '169.254.1.1', '100.64.0.1', '224.0.0.1']) {
      expect(isPrivateAddress(ip), ip).toBe(true)
    }
  })

  it('放行公网 IPv4', async () => {
    const { isPrivateAddress } = await import('../../server/utils/files/remoteImage')
    for (const ip of ['8.8.8.8', '1.1.1.1', '114.114.114.114', '172.15.0.1', '172.32.0.1']) {
      expect(isPrivateAddress(ip), ip).toBe(false)
    }
  })

  it('拒绝内网 IPv6（::1 / ULA / 链路本地）', async () => {
    const { isPrivateAddress } = await import('../../server/utils/files/remoteImage')
    expect(isPrivateAddress('::1')).toBe(true)
    expect(isPrivateAddress('fe80::1')).toBe(true)
    expect(isPrivateAddress('fc00::1')).toBe(true)
    expect(isPrivateAddress('fd00::1')).toBe(true)
  })

  it('放行公网 IPv6', async () => {
    const { isPrivateAddress } = await import('../../server/utils/files/remoteImage')
    expect(isPrivateAddress('2606:4700:4700::1111')).toBe(false)
  })
})

describe('assertSafeRemoteUrl', () => {
  it('拒绝非 http/https 协议', async () => {
    const { assertSafeRemoteUrl } = await import('../../server/utils/files/remoteImage')
    await expect(assertSafeRemoteUrl('ftp://example.com/a.png')).rejects.toThrow(/http\/https/)
    await expect(assertSafeRemoteUrl('file:///etc/passwd')).rejects.toThrow()
    await expect(assertSafeRemoteUrl('javascript:alert(1)')).rejects.toThrow()
  })

  it('拒绝 IP 字面量的内网地址', async () => {
    const { assertSafeRemoteUrl } = await import('../../server/utils/files/remoteImage')
    await expect(assertSafeRemoteUrl('http://127.0.0.1/')).rejects.toThrow(/内网/)
    await expect(assertSafeRemoteUrl('http://10.0.0.5:8080/x.png')).rejects.toThrow(/内网/)
    await expect(assertSafeRemoteUrl('http://192.168.1.1/')).rejects.toThrow(/内网/)
  })

  it('拒绝 localhost / 内网主机名', async () => {
    const { assertSafeRemoteUrl } = await import('../../server/utils/files/remoteImage')
    await expect(assertSafeRemoteUrl('http://localhost:11434/')).rejects.toThrow(/内网主机/)
    await expect(assertSafeRemoteUrl('http://my.internal/x.png')).rejects.toThrow(/内网主机/)
  })

  it('DNS 解析到内网地址时拒绝（防 DNS rebinding）', async () => {
    vi.resetModules()
    vi.doMock('node:dns/promises', () => ({
      lookup: vi.fn(async () => [{ address: '10.0.0.3', family: 4 }]),
    }))
    const { assertSafeRemoteUrl } = await import('../../server/utils/files/remoteImage')
    await expect(assertSafeRemoteUrl('http://evil.example.com/x.png')).rejects.toThrow(/内网/)
  })

  it('公网主机名放行', async () => {
    vi.resetModules()
    vi.doMock('node:dns/promises', () => ({
      lookup: vi.fn(async () => [{ address: '8.8.8.8', family: 4 }]),
    }))
    const { assertSafeRemoteUrl } = await import('../../server/utils/files/remoteImage')
    await expect(assertSafeRemoteUrl('http://example.com/a.png')).resolves.toBeUndefined()
  })
})

describe('sniffImageMime - 图片格式白名单', () => {
  it('识别 jpeg/png/gif/webp/bmp', async () => {
    const { sniffImageMime } = await import('../../server/utils/files/remoteImage')
    expect(sniffImageMime(Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]))).toBe('image/jpeg')
    expect(sniffImageMime(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0]))).toBe('image/png')
    expect(sniffImageMime(Buffer.from('GIF89a'))).toBe('image/gif')
    expect(sniffImageMime(Buffer.from('RIFF\x00\x00\x00\x00WEBPVP8 '))).toBe('image/webp')
    expect(sniffImageMime(Buffer.from([0x42, 0x4D]))).toBe('image/bmp')
  })

  it('拒绝 HTML / 文本等非图片内容', async () => {
    const { sniffImageMime } = await import('../../server/utils/files/remoteImage')
    expect(sniffImageMime(Buffer.from('<!DOCTYPE html><html></html>'))).toBeNull()
    expect(sniffImageMime(Buffer.from('plain text'))).toBeNull()
    expect(sniffImageMime(Buffer.alloc(0))).toBeNull()
  })
})
