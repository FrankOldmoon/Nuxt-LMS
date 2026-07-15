/**
 * Medals composable: manage current user's earned medals
 * - myMedals: list of earned medals
 * - fetchMyMedals: re-fetch
 * - checkMedals: trigger server-side check and grant (called after submission)
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
      // silent
    }
  }

  /** Trigger server-side check and grant; refresh list if new medals awarded */
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
      // silent
    }
  }

  return { myMedals, loading, fetchMyMedals, checkMedals }
}
