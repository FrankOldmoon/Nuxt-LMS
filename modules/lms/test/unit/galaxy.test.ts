/**
 * 课程 3D「知识星系」纯函数层单测
 * @see modules/lms/utils/galaxy.ts
 */
import { describe, it, expect } from 'vitest'
import {
  buildGalaxyModel,
  helixLayout,
  fibonacciSphere,
  hexToInt,
  dominantSource,
  sourceColorHex,
  chapterColorHex,
  GALAXY_SOURCE_COLORS,
} from '../../utils/galaxy'

describe('galaxy: 基础工具', () => {
  it('hexToInt 把 #rrggbb 转成整数色，非法值回退白色', () => {
    expect(hexToInt('#60a5fa')).toBe(parseInt('60a5fa', 16))
    expect(hexToInt('fbbf24')).toBe(parseInt('fbbf24', 16))
    expect(hexToInt('')).toBe(0xffffff)
  })

  it('dominantSource 按固定优先级取主来源', () => {
    expect(dominantSource(['comment', 'course'])).toBe('course')
    expect(dominantSource(['comment', 'question'])).toBe('question')
    expect(dominantSource(['unknown'])).toBe('')
    expect(dominantSource(undefined)).toBe('')
  })

  it('sourceColorHex 按主来源取色，未知来源用兜底色', () => {
    expect(sourceColorHex(['quiz'])).toBe(GALAXY_SOURCE_COLORS.quiz)
    expect(sourceColorHex(['nope'])).toBe('#94a3b8')
  })

  it('chapterColorHex 通过=金、未通过=蓝', () => {
    expect(chapterColorHex(true)).toBe('#fbbf24')
    expect(chapterColorHex(false)).toBe('#60a5fa')
  })
})

describe('galaxy: 布局', () => {
  it('helixLayout 按顺序生成，y 递增且半径恒定', () => {
    const pts = helixLayout(5, { radius: 9, height: 8, turns: 1.5 })
    expect(pts).toHaveLength(5)
    for (let i = 1; i < pts.length; i++) expect(pts[i]!.y).toBeGreaterThan(pts[i - 1]!.y)
    for (const p of pts) expect(Math.hypot(p.x, p.z)).toBeCloseTo(9, 6)
  })

  it('helixLayout 边界：0 个为空，1 个落在环上', () => {
    expect(helixLayout(0)).toEqual([])
    const one = helixLayout(1, { radius: 9 })
    expect(one).toHaveLength(1)
    expect(Math.hypot(one[0]!.x, one[0]!.z)).toBeCloseTo(9, 6)
  })

  it('fibonacciSphere 点均匀落在球壳上', () => {
    const pts = fibonacciSphere(12, 17)
    expect(pts).toHaveLength(12)
    for (const p of pts) expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(17, 6)
    expect(fibonacciSphere(0, 17)).toEqual([])
  })
})

describe('galaxy: buildGalaxyModel', () => {
  const payload = {
    course: { id: 1, title: 'Vue 基础', tags: ['前端'] },
    chapters: [
      { id: 1, title: 'A', isOpen: true, isPass: true, tags: ['reading-tag'] },
      { id: 2, title: 'B', isOpen: false, isPass: false, tags: [] as string[] },
      { id: 3, title: 'C', isOpen: true, isPass: false, tags: ['reading-tag'] },
    ],
    tags: [
      { tag: 'reading-tag', count: 2, sources: ['reading'] },
      { tag: 'q-tag', count: 5, sources: ['question'] },
    ],
    totals: { chapters: 3, tags: 2, contents: 7 },
  }

  it('章节按输入顺序布到螺旋上（y 递增、半径恒定）', () => {
    const m = buildGalaxyModel(payload)
    expect(m.chapters.map(c => c.id)).toEqual([1, 2, 3])
    expect(m.chapters[0]!.pos[1]).toBeLessThan(m.chapters[2]!.pos[1])
    for (const c of m.chapters) expect(Math.hypot(c.pos[0], c.pos[2])).toBeCloseTo(9, 6)
  })

  it('章节配色与开放状态正确', () => {
    const m = buildGalaxyModel(payload)
    expect(m.chapters[0]!.color).toBe(hexToInt('#fbbf24')) // 通过
    expect(m.chapters[1]!.color).toBe(hexToInt('#60a5fa')) // 未通过
    expect(m.chapters[1]!.isOpen).toBe(false)
    expect(m.chapters[0]!.isOpen).toBe(true)
  })

  it('标签配色按来源，尺寸随出现次数增长', () => {
    const m = buildGalaxyModel(payload)
    const reading = m.tags.find(t => t.tag === 'reading-tag')!
    const q = m.tags.find(t => t.tag === 'q-tag')!
    expect(reading.color).toBe(hexToInt(GALAXY_SOURCE_COLORS.reading))
    expect(q.color).toBe(hexToInt(GALAXY_SOURCE_COLORS.question))
    expect(q.radius).toBeGreaterThan(reading.radius)
  })

  it('连线：标签有归属连章节，无归属连核心', () => {
    const m = buildGalaxyModel(payload)
    // reading-tag 归属章节 1、3（2 条线）；q-tag 无归属 → 连核心（1 条线）
    expect(m.links).toHaveLength(3)
    const toCore = m.links.filter(l => l.to[0] === 0 && l.to[1] === 0 && l.to[2] === 0)
    expect(toCore).toHaveLength(1)
  })

  it('usedSources 只含实际出现、且按固定顺序', () => {
    const m = buildGalaxyModel(payload)
    expect(m.usedSources).toEqual(['reading', 'question'])
  })

  it('核心取课程标题与标签', () => {
    const m = buildGalaxyModel(payload)
    expect(m.core.title).toBe('Vue 基础')
    expect(m.core.tags).toEqual(['前端'])
  })

  it('过滤非法条目，空数据安全', () => {
    const m = buildGalaxyModel({
      chapters: [{ id: NaN, title: 'bad' }, { id: 9, title: 'ok', tags: ['x'] }] as any,
      tags: [{ tag: '' } as any, { tag: 'x', count: 1, sources: ['reading'] }],
    })
    expect(m.chapters.map(c => c.id)).toEqual([9])
    expect(m.tags.map(t => t.tag)).toEqual(['x'])
    expect(buildGalaxyModel(null).chapters).toEqual([])
    expect(buildGalaxyModel(undefined).tags).toEqual([])
  })
})
