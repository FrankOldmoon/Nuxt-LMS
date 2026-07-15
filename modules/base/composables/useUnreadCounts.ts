/**
 * Global unread count state
 *
 * Data source: /api/notifications/unread returns { notifyUnread, msgUnread }
 * - cRequest.use auto-deduplicates by URL, multiple calls share the same useFetch cache
 * - After modal closes: call refresh() to re-fetch, timely update read status
 */
type UnreadCounts = {
  notifyUnread: number
  msgUnread: number
}

export function useUnreadCounts() {
  const { data, refresh: refreshData } = cRequest.use<UnreadCounts>('/api/notifications/unread', {
    default: () => ({ notifyUnread: 0, msgUnread: 0 }),
  })

  const counts = computed<UnreadCounts>(() => ({
    notifyUnread: data.value?.notifyUnread ?? 0,
    msgUnread: data.value?.msgUnread ?? 0,
  }))

  /** Refresh unread counts */
  async function refresh() {
    await refreshData()
  }

  return { counts, refresh }
}
