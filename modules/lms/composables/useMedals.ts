/**
 * 奖章 composable：管理当前用户的已获奖章
 * - myMedals: 已获得的奖章列表
 * - fetchMyMedals: 重新拉取
 * - checkMedals: 触发服务端检查并授予（提交后调用）
 */
export interface MyMedal {
  medalId: number
  name: string
  content: {
    icon: string
    color: string
    tier: number
    description: string
    conditions: any[]
    logic: 'all' | 'any'
  }
  createdAt: string
}

export function useMedals() {
  const myMedals = useState<MyMedal[]>('my-medals', () => [])
  const loading = useState<boolean>('my-medals-loading', () => false)

  async function fetchMyMedals() {
    try {
      const data = await cRequest<MyMedal[]>('/api/medals/my')
      myMedals.value = data || []
    } catch {
      // 静默
    }
  }

  /** 触发服务端检查并授予，若有新奖章则刷新列表 */
  async function checkMedals(courseId: number) {
    if (!courseId) return
    try {
      const newIds = await cRequest<number[]>('/api/medals/check', {
        query: { courseId },
      })
      if (Array.isArray(newIds) && newIds.length > 0) {
        await fetchMyMedals()
      }
    } catch {
      // 静默
    }
  }

  return { myMedals, loading, fetchMyMedals, checkMedals }
}
