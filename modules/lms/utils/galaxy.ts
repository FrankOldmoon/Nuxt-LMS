/**
 * 课程「知识星系」3D 可视化的纯函数层（不依赖 three / DOM，可单测）。
 *
 * 职责：把 /api/courses/galaxy 返回的课程数据，换算成一套可直接喂给 three 的
 * 场景模型（核心 / 章节节点 / 标签节点 / 连线），坐标与配色都在这里确定：
 *   - 章节：按文档顺序排成一条缓螺旋（保证"按顺序"的观感）
 *   - 标签：均匀分布在外层球壳（斐波那契球）
 *   - 连线：标签 → 含有该标签的章节；若没有任何章节引用该标签，则连到核心
 */

/** 标签来源的固定优先级（决定一个多来源标签用哪种颜色） */
export const GALAXY_SOURCE_ORDER = [
  'course', 'reading', 'question', 'homework', 'quiz', 'practice', 'comment',
] as const

export type GalaxySource = (typeof GALAXY_SOURCE_ORDER)[number]

/** 各来源主题色（与前端图例共用） */
export const GALAXY_SOURCE_COLORS: Record<string, string> = {
  course: '#a855f7',
  reading: '#22d3ee',
  question: '#f59e0b',
  homework: '#34d399',
  quiz: '#60a5fa',
  practice: '#f472b6',
  comment: '#fbbf24',
}

/** 章节节点配色：已通过=金色，未通过=蓝色 */
export const GALAXY_CHAPTER_PASS_COLOR = '#fbbf24'
export const GALAXY_CHAPTER_TODO_COLOR = '#60a5fa'
/** 兜底色（无来源信息时） */
export const GALAXY_FALLBACK_COLOR = '#94a3b8'

export interface GalaxyChapterInput {
  id: number
  title?: string
  isOpen?: boolean
  isPass?: boolean
  tags?: string[]
}

export interface GalaxyTagInput {
  tag: string
  count?: number
  sources?: string[]
}

export interface GalaxyPayload {
  course?: { id?: number, title?: string, tags?: string[] }
  chapters?: GalaxyChapterInput[]
  tags?: GalaxyTagInput[]
  totals?: { chapters?: number, tags?: number, contents?: number }
}

export interface GalaxyVec3 { x: number, y: number, z: number }

export interface GalaxyModelChapter {
  id: number
  title: string
  isOpen: boolean
  isPass: boolean
  tags: string[]
  pos: [number, number, number]
  color: number
  radius: number
}

export interface GalaxyModelTag {
  tag: string
  count: number
  sources: string[]
  pos: [number, number, number]
  color: number
  radius: number
}

export interface GalaxyModelLink {
  from: [number, number, number]
  to: [number, number, number]
  color: number
}

export interface GalaxyModel {
  core: { title: string, tags: string[], pos: [number, number, number], radius: number }
  chapters: GalaxyModelChapter[]
  tags: GalaxyModelTag[]
  links: GalaxyModelLink[]
  usedSources: string[]
}

// 星系几何参数
const CORE_RADIUS = 2.2
const CHAPTER_RING = 9
const CHAPTER_SPREAD = 7
const CHAPTER_TURNS = 1.5
const TAG_SHELL = 17

/** #rrggbb → 0xrrggbb（three 用整数色） */
export function hexToInt(hex: string): number {
  const v = parseInt(String(hex || '').replace(/^#/, ''), 16)
  return Number.isFinite(v) ? v : 0xffffff
}

/** 从来源集合中按固定优先级取「主来源」，无匹配返回 '' */
export function dominantSource(sources: string[] | undefined): string {
  const list = Array.isArray(sources) ? sources : []
  for (const s of GALAXY_SOURCE_ORDER) if (list.includes(s)) return s
  return ''
}

/** 标签配色：按主来源取色 */
export function sourceColorHex(sources: string[] | undefined): string {
  const key = dominantSource(sources)
  return GALAXY_SOURCE_COLORS[key] || GALAXY_FALLBACK_COLOR
}

/** 章节配色：按是否通过 */
export function chapterColorHex(isPass: boolean): string {
  return isPass ? GALAXY_CHAPTER_PASS_COLOR : GALAXY_CHAPTER_TODO_COLOR
}

/**
 * 螺旋布局：把 count 个章节均匀布到一条缓螺旋上。
 * 返回按顺序排列的点（y 从低到高，x/z 绕轴旋转），保证"按 heading 顺序"的观感。
 */
export function helixLayout(count: number, opts: { radius?: number, height?: number, turns?: number } = {}): GalaxyVec3[] {
  const n = Math.max(0, Math.floor(Number(count) || 0))
  const radius = opts.radius ?? CHAPTER_RING
  const height = opts.height ?? CHAPTER_SPREAD
  const turns = opts.turns ?? CHAPTER_TURNS
  if (n === 0) return []
  if (n === 1) return [{ x: radius, y: 0, z: 0 }]
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1)
    const angle = t * Math.PI * 2 * turns
    return {
      x: Math.cos(angle) * radius,
      y: (t - 0.5) * height,
      z: Math.sin(angle) * radius,
    }
  })
}

/** 斐波那契球：把 count 个点均匀分布在半径 radius 的球面上 */
export function fibonacciSphere(count: number, radius: number): GalaxyVec3[] {
  const n = Math.max(0, Math.floor(Number(count) || 0))
  if (n === 0) return []
  if (n === 1) return [{ x: 0, y: radius, z: 0 }]
  const golden = Math.PI * (3 - Math.sqrt(5))
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (i / (n - 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const th = golden * i
    return {
      x: Math.cos(th) * r * radius,
      y: y * radius,
      z: Math.sin(th) * r * radius,
    }
  })
}

/** 章节节点半径：随标签数量略增 */
function chapterRadius(tagCount: number): number {
  return 0.9 + Math.min(0.9, Math.sqrt(Math.max(0, tagCount)) * 0.22)
}

/** 标签节点半径：随出现次数对数增长 */
function tagRadius(count: number): number {
  return 0.32 + Math.min(0.5, Math.log2(Math.max(0, count) + 1) * 0.14)
}

/** 把接口数据编译成 three 场景模型 */
export function buildGalaxyModel(payload: GalaxyPayload | null | undefined): GalaxyModel {
  const course = (payload && payload.course) || {}
  const rawChapters = Array.isArray(payload?.chapters) ? payload!.chapters! : []
  const rawTags = Array.isArray(payload?.tags) ? payload!.tags! : []

  // ---- 章节（先过滤，再按顺序布点）----
  const chaptersIn = rawChapters
    .filter(c => c && Number.isFinite(Number(c.id)))
    .map(c => ({ ...c, tags: Array.isArray(c.tags) ? c.tags.filter(Boolean) : [] }))
  const chapterPos = helixLayout(chaptersIn.length, {
    radius: CHAPTER_RING, height: CHAPTER_SPREAD, turns: CHAPTER_TURNS,
  })
  const chapters: GalaxyModelChapter[] = chaptersIn.map((c, i) => {
    const p = chapterPos[i] || { x: 0, y: 0, z: 0 }
    return {
      id: Number(c.id),
      title: c.title || '',
      isOpen: c.isOpen !== false,
      isPass: c.isPass === true,
      tags: c.tags,
      pos: [p.x, p.y, p.z],
      color: hexToInt(chapterColorHex(c.isPass === true)),
      radius: chapterRadius(c.tags.length),
    }
  })

  // ---- 标签（先过滤，再均匀布球）----
  const tagsIn = rawTags
    .filter(t => t && t.tag)
    .map(t => ({
      tag: String(t.tag),
      count: Number(t.count) || 0,
      sources: Array.isArray(t.sources) ? t.sources.filter(Boolean) : [],
    }))
  const tagPos = fibonacciSphere(tagsIn.length, TAG_SHELL)
  const tags: GalaxyModelTag[] = tagsIn.map((t, i) => {
    const p = tagPos[i] || { x: 0, y: 0, z: 0 }
    return {
      tag: t.tag,
      count: t.count,
      sources: t.sources,
      pos: [p.x, p.y, p.z],
      color: hexToInt(sourceColorHex(t.sources)),
      radius: tagRadius(t.count),
    }
  })

  // ---- 连线：标签 → 含该标签的章节；无归属则连到核心 ----
  const links: GalaxyModelLink[] = []
  for (const t of tags) {
    const owners = chapters.filter(c => c.tags.includes(t.tag))
    if (owners.length) {
      for (const c of owners) links.push({ from: t.pos, to: c.pos, color: t.color })
    } else {
      links.push({ from: t.pos, to: [0, 0, 0], color: t.color })
    }
  }

  // ---- 实际用到的来源（用于图例）----
  const used = new Set<string>()
  for (const t of tags) for (const s of t.sources) used.add(s)
  const usedSources = GALAXY_SOURCE_ORDER.filter(s => used.has(s))

  return {
    core: {
      title: course.title || '',
      tags: Array.isArray(course.tags) ? course.tags.filter(Boolean) : [],
      pos: [0, 0, 0],
      radius: CORE_RADIUS,
    },
    chapters,
    tags,
    links,
    usedSources,
  }
}
