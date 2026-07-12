/**
 * 章节历史版本弹窗逻辑
 * - 拉取历史版本列表
 * - 分页浏览内容预览
 * - 恢复指定版本
 */
export function useChapterHistory(props: { table: string; id: number }) {
  const { t } = useI18n()
  const toast = useToast()
  const { notifyContentSaved } = useLayoutState()

  const open = ref(false)
  const versions = ref<{ id: number; content: any; createdAt: string }[]>([])
  const pending = ref(false)
  const restoring = ref(false)
  // 当前页码（1 起始，versions 按最新在前排序，故 page=1 即最新版本）
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
      // 通知页面刷新数据（contentVersion +1，页面 watch 会重新拉取）
      notifyContentSaved()
      open.value = false
      location.reload()
    } catch {
      // cRequest 已抛错，此处无需额外处理
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

  // 打开弹窗时拉取历史版本
  watch(open, (val) => {
    if (val) fetchVersions()
  })

  return {
    open, versions, pending, restoring, page, currentVersion,
    fetchVersions, handleRestore, prevPage, nextPage,
  }
}
