/**
 * Chapter history version modal logic
 * - Fetch history version list
 * - Paginate content preview
 * - Restore specified version
 */
export function useChapterHistory(props: { table: string; id: number }) {
  const { t } = useI18n()
  const toast = useToast()
  const { notifyContentSaved } = useLayoutState()

  const open = ref(false)
  const versions = ref<{ id: number; content: any; createdAt: string }[]>([])
  const pending = ref(false)
  const restoring = ref(false)
  // Current page number (1-based, versions sorted newest first, so page=1 is the latest version)
  const page = ref(1)

  const currentVersion = computed(() => versions.value[page.value - 1] ?? null)

  async function fetchVersions() {
    if (!props.id || !props.table) {
      versions.value = []
      return
    }
    pending.value = true
    try {
      const data = await cRequest<{ id: number; content: any; createdAt: string }[]>(
        `/api/${props.table}/versions?id=${props.id}`,
      )
      versions.value = data || []
      page.value = 1
    } catch {
      versions.value = []
    } finally {
      pending.value = false
    }
  }

  async function handleRestore(versionId: number) {
    restoring.value = true
    try {
      await cRequest(`/api/${props.table}/restore`, {
        method: 'POST',
        body: { versionId },
      })
      toast.add({ title: t('layout.restoreSuccess'), color: 'success' })
      // Notify page to refresh data (contentVersion +1, page watch will re-fetch)
      notifyContentSaved()
      open.value = false
      location.reload()
    } catch {
      // cRequest already throws error, no extra handling needed here
    } finally {
      restoring.value = false
    }
  }

  function prevPage() {
    if (page.value > 1) page.value--
  }
  function nextPage() {
    if (page.value < versions.value.length) page.value++
  }

  // Fetch history versions when modal opens
  watch(open, (val) => {
    if (val) fetchVersions()
  })

  return {
    open, versions, pending, restoring, page, currentVersion,
    fetchVersions, handleRestore, prevPage, nextPage,
  }
}
