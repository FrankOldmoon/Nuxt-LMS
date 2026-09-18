/**
 * useHomeworkRecords composable 测试（全屏逐份评阅：导航循环 + 文件预览类型判断）
 * @see modules/lms/components/lms/recordsModal/homework/useHomeworkRecords.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n, setMockLmsContext } from '../../../../test/setup/nuxt-stubs'

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
})