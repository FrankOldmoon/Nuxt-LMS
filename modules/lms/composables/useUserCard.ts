/**
 * userCard real-time refresh trigger
 *
 * After any operation that changes the current user's points/experience (answering questions, submitting homework, commenting, etc.) completes,
 * call refresh() to increment the counter, userCard.vue watches this trigger to automatically re-fetch points.
 *
 * Cross-component communication: userCard is in the layout sidebar, submit components are in the page main area,
 * reactive linkage is achieved via useState's global state, no need for ref pass-through or event bus.
 */
export function useUserCard() {
  const refreshTrigger = useState<number>('user-card-refresh-trigger', () => 0)

  /** Notify userCard to re-fetch course/chapter points */
  function refresh() {
    refreshTrigger.value++
  }

  return { refreshTrigger, refresh }
}
