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
      { userId: 1, record: { score: '5', files: [], comment: null, excellent: false } },
      { userId: 3, record: { score: '8', files: [], comment: null, excellent: false } },
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

  it('isPreviewableFile 区分可预览与仅下载类型', async () => {
    const ctx = await makeCtx([])
    expect(ctx.isPreviewableFile('/api/files/serve?pathname=2%2Fx.pdf')).toBe(true)
    expect(ctx.isPreviewableFile('/api/files/serve?pathname=2%2Fx.png')).toBe(true)
    expect(ctx.isPreviewableFile('/api/files/serve?pathname=2%2Fscript.py')).toBe(true)
    expect(ctx.isPreviewableFile('/api/files/serve?pathname=2%2Fx.zip')).toBe(false)
    expect(ctx.isPreviewableFile('/api/files/serve?pathname=2%2Fx.rar')).toBe(false)
  })
})