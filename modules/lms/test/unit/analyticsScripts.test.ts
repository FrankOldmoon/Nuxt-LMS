/**
 * analyticsScripts — 站点统计脚本构建
 * @see modules/lms/utils/analyticsScripts.ts
 */
import { describe, it, expect } from 'vitest'
import { buildAnalyticsScripts } from '../../utils/analyticsScripts'

describe('buildAnalyticsScripts', () => {
  it('无 token → 不注入任何脚本', () => {
    expect(buildAnalyticsScripts()).toEqual([])
    expect(buildAnalyticsScripts('', '')).toEqual([])
  })

  it('仅谷歌 → 注入 gtag 外链 + 初始化内联脚本', () => {
    const s = buildAnalyticsScripts('G-ABC123', '')
    expect(s).toHaveLength(2)
    expect(s[0]).toMatchObject({
      src: 'https://www.googletagmanager.com/gtag/js?id=G-ABC123',
      async: true,
    })
    expect(s[1].children).toContain("gtag('config','G-ABC123')")
  })

  it('仅百度 → 注入 hm.baidu.com 内联脚本', () => {
    const s = buildAnalyticsScripts('', '0123abcd')
    expect(s).toHaveLength(1)
    expect(s[0].children).toContain('https://hm.baidu.com/hm.js?0123abcd')
  })

  it('同时配置 → 顺序：谷歌外链、谷歌初始化、百度', () => {
    const s = buildAnalyticsScripts('G-1', 'aabbccdd')
    expect(s.map(x => x.src || 'inline')).toEqual([
      'https://www.googletagmanager.com/gtag/js?id=G-1',
      'inline',
      'inline',
    ])
  })

  it('token 白名单：不匹配格式则整体丢弃，防止注入', () => {
    // 恶意注入串（含 <script> 标签）不匹配 GA/百度 token 格式 → 完全丢弃
    const s = buildAnalyticsScripts('G-1"></script><script>alert(1)</script>', '')
    expect(s).toEqual([])
    // 无前缀 / 过短的串同样被丢弃
    expect(buildAnalyticsScripts('abc', '')).toEqual([])
  })
})
