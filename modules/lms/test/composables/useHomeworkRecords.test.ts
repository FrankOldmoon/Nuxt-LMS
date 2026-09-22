/**
 * useHomeworkRecords composable 测试（全屏逐份评阅：导航循环 + 文件预览类型判断）
 * @see modules/lms/components/lms/recordsModal/homework/useHomeworkRecords.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n, setMockLmsContext, getToastCalls } from '../../../../test/setup/nuxt-stubs'

// 「一键下载全部附件」动态 import('jszip')：用轻量假实现，避免真实压缩开销。
// 记录写入 zip 的文件条目（folderPath/fileName/content），便于断言外链生成了 .url 文件。
const zipEntries: { folder: string; name: string; content: any }[] = []
vi.mock('jszip', () => ({
  default: class {
    folder(name: string) {
      return { file: (fileName: string, content: any) => { zipEntries.push({ folder: name, name: fileName, content }) } }
    }
    async generateAsync() { return new Blob(['zip']) }
  },
}))

const students = [
  { id: 1, name: 'A', preferName: '', rollNumber: '', username: '', avatarImg: '', isTeacher: false },
  { id: 2, name: 'B', preferName: '', rollNumber: '', username: '', avatarImg: '', isTeacher: false },
  { id: 3, name: 'C', preferName: '', rollNumber: '', username: '', avatarImg: '', isTeacher: false },
]

beforeEach(async () => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
  setMockLmsContext(1, 1)
  ;(globalThis as any).useClassUsers = () => ({ students: ref(students), teachers: ref([]) })
  zipEntries.length = 0
})

async function makeCtx(records: any[]) {
  // 模拟 /api/homeworks/records 返回
  ;(globalThis as any).cRequest = async () => records
  const { useHomeworkRecords } = await import('../../components/lms/recordsModal/homework/useHomeworkRecords')
  return useHomeworkRecords({ modelValue: true, courseId: 1, cid: 100, maxScore: 10 } as any, () => {})
}

describe('useHomeworkRecords 全屏评阅', () => {
  it('openHomeworkDetail + next/prev 循环切换', async () => {
    const ctx = await makeCtx([
      { userId: 1, record: { score: '5', files: [{ url: 'a.pdf' }], comment: null, excellent: false, record: { _submitCount: 1 } } },
      { userId: 3, record: { score: '8', files: [{ url: 'b.png' }], comment: null, excellent: false, record: { _submitCount: 1 } } },
    ])
    await ctx.fetchRecords()
    const sub1 = ctx.rows.value.find(r => r.id === 1)
    ctx.openHomeworkDetail(sub1)
    expect(ctx.detailTotal.value).toBe(2)
    expect(ctx.detailData.value?.id).toBe(1)

    ctx.nextSubmission()
    expect(ctx.detailData.value?.id).toBe(3)
    ctx.nextSubmission() // 循环回到第一篇
    expect(ctx.detailData.value?.id).toBe(1)
    ctx.prevSubmission() // 前一篇循环到最后
    expect(ctx.detailData.value?.id).toBe(3)
  })

  it('hasSubmission 区分真实提交与「仅评分」记录', async () => {
    const ctx = await makeCtx([
      // 真实提交（submit API 会写入 record）
      { userId: 1, record: { score: '5', files: [], comment: null, excellent: false, record: { _submitCount: 1 } } },
      // 教师为未提交学生打的「仅评分」记录：record/content/files 均为空
      { userId: 2, record: { score: '0', files: null, content: null, comment: '未提交', excellent: false, record: null } },
    ])
    await ctx.fetchRecords()
    expect(ctx.hasSubmission(ctx.rows.value.find(r => r.id === 1)?.record)).toBe(true)
    expect(ctx.hasSubmission(ctx.rows.value.find(r => r.id === 2)?.record)).toBe(false)
    // 仅评分记录不计入逐份评阅列表
    expect(ctx.detailTotal.value).toBe(1)
  })

  it('未提交学生也能保存打分（本地补记录）', async () => {
    const calls: any[] = []
    const ctx = await makeCtx([])
    ;(globalThis as any).cRequest = async (url: string, opts: any) => { calls.push({ url, opts }); return [] }
    await ctx.fetchRecords()
    const row = ctx.rows.value.find(r => r.id === 2)!
    expect(row.record).toBe(null)
    ctx.scoreMap[row.id] = 7
    await ctx.onScoreBlur(row)
    const scoreCall = calls.find(c => c.url === '/api/homeworks/score')
    expect(scoreCall).toBeTruthy()
    expect(scoreCall.opts.body.user_id).toBe(2)
    // 保存后本地行有记录，表格可即时反映
    expect(row.record?.score).toBe('7')
    expect(ctx.hasSubmission(row.record)).toBe(false)
  })

  it('onScoreBlur：分数超过满分时钳制到满分', async () => {
    const calls: any[] = []
    const ctx = await makeCtx([])
    ;(globalThis as any).cRequest = async (url: string, opts: any) => { calls.push({ url, opts }); return [] }
    await ctx.fetchRecords()
    const row = ctx.rows.value.find(r => r.id === 2)!
    ctx.scoreMap[row.id] = 999
    await ctx.onScoreBlur(row)
    const scoreCall = calls.find(c => c.url === '/api/homeworks/score')
    expect(scoreCall.opts.body.score).toBe(10) // maxScore=10
    expect(ctx.scoreMap[row.id]).toBe(10)
  })

  it('onScoreBlur：分数为负时钳制到 0，且支持小数', async () => {
    const calls: any[] = []
    const ctx = await makeCtx([])
    ;(globalThis as any).cRequest = async (url: string, opts: any) => { calls.push({ url, opts }); return [] }
    await ctx.fetchRecords()
    const row = ctx.rows.value.find(r => r.id === 2)!
    ctx.scoreMap[row.id] = -3
    await ctx.onScoreBlur(row)
    expect(calls.find(c => c.url === '/api/homeworks/score').opts.body.score).toBe(0)
    // 小数保留
    calls.length = 0
    ctx.scoreMap[row.id] = 6.5
    await ctx.onScoreBlur(row)
    expect(calls.find(c => c.url === '/api/homeworks/score').opts.body.score).toBe(6.5)
  })

  it('submittedAtOf：优先 _submittedAt，回退 createdAt，并暴露提交时间列', async () => {
    const ctx = await makeCtx([])
    expect(ctx.extraColumns.value.map((c: any) => c.id)).toContain('submittedAt')
    expect(ctx.submittedAtOf({ record: { _submittedAt: '2026-05-01T00:00:00.000Z' }, createdAt: '2026-01-01T00:00:00.000Z' }))
      .toBe('2026-05-01T00:00:00.000Z')
    expect(ctx.submittedAtOf({ record: { _submitCount: 0 }, createdAt: '2026-01-01T00:00:00.000Z' }))
      .toBe('2026-01-01T00:00:00.000Z')
    expect(ctx.submittedAtOf(null)).toBe(null)
  })

  it('isPreviewableFile 区分可预览与仅下载类型', async () => {
    const ctx = await makeCtx([])
    expect(ctx.isPreviewableFile('/api/files/serve?pathname=2%2Fx.pdf')).toBe(true)
    expect(ctx.isPreviewableFile('/api/files/serve?pathname=2%2Fx.png')).toBe(true)
    expect(ctx.isPreviewableFile('/api/files/serve?pathname=2%2Fscript.py')).toBe(true)
    expect(ctx.isPreviewableFile('/api/files/serve?pathname=2%2Fx.zip')).toBe(false)
    expect(ctx.isPreviewableFile('/api/files/serve?pathname=2%2Fx.rar')).toBe(false)
  })

  it('downloadAllFiles：没有附件时只提示，不触发下载', async () => {
    const ctx = await makeCtx([
      { userId: 1, record: { files: [], record: { _submitCount: 1 } } },
      { userId: 2, record: { files: null, record: { _submitCount: 1 } } },
    ])
    await ctx.fetchRecords()
    await ctx.downloadAllFiles()
    expect(getToastCalls().some((c: any) => c.title === 'record.noAttachments')).toBe(true)
  })

  it('downloadAllFiles：按学生分文件夹打包并触发下载', async () => {
    const ctx = await makeCtx([
      { userId: 1, record: { files: ['/api/files/serve?pathname=1%2Fa.pdf'], record: { _submitCount: 1 } } },
      { userId: 3, record: { files: [{ url: '/api/files/serve?pathname=3%2Fb.png' }], record: { _submitCount: 1 } } },
    ])
    await ctx.fetchRecords()
    // /api/files/meta 返回原始文件名
    ;(globalThis as any).cRequest = async () => ({ name: 'x.pdf' })
    ;(globalThis as any).getFileNameFromUrl = () => 'x.pdf'
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, blob: async () => new Blob(['f']) })))
    ;(URL as any).createObjectURL = vi.fn(() => 'blob:x')
    ;(URL as any).revokeObjectURL = vi.fn()
    const click = vi.fn()
    const fakeLink: any = { href: '', download: '', click, remove: vi.fn() }
    const createEl = vi.spyOn(document, 'createElement').mockReturnValue(fakeLink)
    const append = vi.spyOn(document.body, 'appendChild').mockImplementation(() => fakeLink)

    try {
      await ctx.downloadAllFiles()
      expect(click).toHaveBeenCalled()
      expect(String(fakeLink.download)).toContain('.zip')
      expect(getToastCalls().some((c: any) => c.title === 'record.downloadAllDone')).toBe(true)
    } finally {
      createEl.mockRestore()
      append.mockRestore()
      vi.unstubAllGlobals()
    }
  })

  it('downloadAllFiles：文件夹名为「姓名(用户名)」，缺用户名时只用姓名', async () => {
    ;(globalThis as any).useClassUsers = () => ({
      students: ref([
        { id: 1, name: '张三', preferName: '小张', rollNumber: '', username: 'zhangsan', avatarImg: '', isTeacher: false },
        { id: 2, name: '李四', preferName: '', rollNumber: '', username: '', avatarImg: '', isTeacher: false },
      ]),
      teachers: ref([]),
    })
    const ctx = await makeCtx([
      { userId: 1, record: { files: ['/api/files/serve?pathname=1%2Fa.pdf'], record: { _submitCount: 1 } } },
      { userId: 2, record: { files: ['/api/files/serve?pathname=2%2Fb.pdf'], record: { _submitCount: 1 } } },
    ])
    await ctx.fetchRecords()
    ;(globalThis as any).cRequest = async () => ({ name: 'x.pdf' })
    ;(globalThis as any).getFileNameFromUrl = () => 'x.pdf'
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, blob: async () => new Blob(['f']) })))
    ;(URL as any).createObjectURL = vi.fn(() => 'blob:x')
    ;(URL as any).revokeObjectURL = vi.fn()
    const fakeLink: any = { href: '', download: '', click: vi.fn(), remove: vi.fn() }
    const createEl = vi.spyOn(document, 'createElement').mockReturnValue(fakeLink)
    const append = vi.spyOn(document.body, 'appendChild').mockImplementation(() => fakeLink)

    try {
      await ctx.downloadAllFiles()
      const folders = zipEntries.map(e => e.folder)
      expect(folders).toContain('张三(zhangsan)')   // 姓名 + 用户名
      expect(folders).toContain('李四')              // 没有用户名时只用姓名
    } finally {
      createEl.mockRestore()
      append.mockRestore()
      vi.unstubAllGlobals()
    }
  })

  it('downloadAllFiles：外链附件不实际下载，生成本站外链可双击的 .url 文件', async () => {
    const ctx = await makeCtx([
      { userId: 1, record: { files: ['https://example.com/share/a.pdf'], record: { _submitCount: 1 } } },
      { userId: 2, record: { files: ['/api/files/serve?pathname=2%2Frealfile.pdf'], record: { _submitCount: 1 } } },
    ])
    await ctx.fetchRecords()
    ;(globalThis as any).getFileNameFromUrl = (url: string) => {
      const u = new URL(url, 'http://x')
      const p = u.searchParams.get('pathname')
      if (p) return p.split('/').pop() || p || 'file'
      return u.pathname.split('/').pop() || 'file'
    }
    const fetchSpy = vi.fn(async () => ({ ok: true, blob: async () => new Blob(['f']) }))
    vi.stubGlobal('fetch', fetchSpy)
    ;(URL as any).createObjectURL = vi.fn(() => 'blob:x')
    ;(URL as any).revokeObjectURL = vi.fn()
    const click = vi.fn()
    const fakeLink: any = { href: '', download: '', click, remove: vi.fn() }
    const createEl = vi.spyOn(document, 'createElement').mockReturnValue(fakeLink)
    const append = vi.spyOn(document.body, 'appendChild').mockImplementation(() => fakeLink)

    try {
      await ctx.downloadAllFiles()
      // 外链：不调用 fetch，且写入 .url 快捷方式
      const urlEntry = zipEntries.find(e => e.name.endsWith('.url'))
      expect(urlEntry).toBeTruthy()
      expect(String(urlEntry!.content)).toContain('https://example.com/share/a.pdf')
      expect(String(urlEntry!.content)).toContain('[InternetShortcut]')
      // 本站文件：走 fetch 下载真实内容
      const realEntry = zipEntries.find(e => e.name === 'realfile.pdf')
      expect(realEntry).toBeTruthy()
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    } finally {
      createEl.mockRestore()
      append.mockRestore()
      vi.unstubAllGlobals()
    }
  })

  it('scoreAllSubmitted：给已提交同学打满分，跳过已满分与未提交', async () => {
    const calls: any[] = []
    const ctx = await makeCtx([
      { userId: 1, record: { score: '10', files: [], record: { _submitCount: 1 } } },
      { userId: 2, record: { score: null, files: ['a.pdf'], record: { _submitCount: 1 } } },
      { userId: 3, record: { score: null, files: null, record: null } },
    ])
    await ctx.fetchRecords()
    ;(globalThis as any).cRequest = async (url: string, opts: any) => { calls.push({ url, opts }); return {} }
    await ctx.scoreAllSubmitted()
    const scoreCalls = calls.filter((c: any) => c.url === '/api/homeworks/score')
    expect(scoreCalls).toHaveLength(1)
    expect(scoreCalls[0].opts.body.user_id).toBe(2)
    expect(scoreCalls[0].opts.body.score).toBe(10)
    expect(ctx.scoreMap[2]).toBe(10)
    expect(getToastCalls().some((c: any) => c.title === 'record.scoreAllDone')).toBe(true)
  })

  it('scoreAllSubmitted：没有需要打分的提交时只提示，不发请求', async () => {
    const calls: any[] = []
    const ctx = await makeCtx([
      { userId: 1, record: { score: '10', files: [], record: { _submitCount: 1 } } },
    ])
    await ctx.fetchRecords()
    ;(globalThis as any).cRequest = async (url: string, opts: any) => { calls.push({ url, opts }); return {} }
    await ctx.scoreAllSubmitted()
    expect(calls.filter((c: any) => c.url === '/api/homeworks/score')).toHaveLength(0)
    expect(getToastCalls().some((c: any) => c.title === 'record.scoreAllNone')).toBe(true)
  })
})