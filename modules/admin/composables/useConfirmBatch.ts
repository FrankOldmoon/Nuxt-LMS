type ConfirmAction = 'delete' | 'remove' | 'restore'

/**
 * Batch/single confirm dialog (delete / restore / permanent delete)
 *
 * Manages confirmOpen / confirmAction / confirmRows / confirmLoading state,
 * provides confirmBatch (batch) / onSingleXxx (single) trigger methods + executeConfirm execution callback.
 *
 * Caller must pass three execution functions (batchDelete / batchRemove / batchRestore),
 * these functions come from useAdminTable.
 *
 * Extracted from Manager.vue.
 */
export function useConfirmBatch(
  batchDelete: (rows: Record<string, any>[]) => Promise<void>,
  batchRemove: (rows: Record<string, any>[]) => Promise<void>,
  batchRestore: (rows: Record<string, any>[]) => Promise<void>,
) {
  const { t } = useI18n()

  const confirmOpen = ref(false)
  const confirmAction = ref<ConfirmAction>('delete')
  const confirmRows = ref<Record<string, any>[]>([])
  const confirmLoading = ref(false)

  const confirmText = computed(() => {
    const count = confirmRows.value.length
    if (confirmAction.value === 'delete') return t('admin.table.confirmDelete', { count })
    if (confirmAction.value === 'remove') return t('admin.table.confirmRemove', { count })
    return t('admin.table.confirmRestore', { count })
  })

  const confirmColor = computed(() =>
    confirmAction.value === 'restore' ? 'success' : 'error',
  )

  function openConfirm(action: ConfirmAction, rows: Record<string, any>[]) {
    confirmAction.value = action
    confirmRows.value = rows
    confirmOpen.value = true
  }

  function confirmBatch(action: ConfirmAction, rows: Record<string, any>[]) {
    openConfirm(action, [...rows])
  }

  function onSingleDelete(row: Record<string, any>) { openConfirm('delete', [row]) }
  function onSingleRestore(row: Record<string, any>) { openConfirm('restore', [row]) }
  function onSingleRemove(row: Record<string, any>) { openConfirm('remove', [row]) }

  async function executeConfirm() {
    confirmLoading.value = true
    try {
      if (confirmAction.value === 'delete') await batchDelete(confirmRows.value)
      else if (confirmAction.value === 'remove') await batchRemove(confirmRows.value)
      else await batchRestore(confirmRows.value)
      confirmOpen.value = false
    } finally {
      confirmLoading.value = false
    }
  }

  return {
    confirmOpen, confirmText, confirmColor, confirmLoading,
    confirmBatch, onSingleDelete, onSingleRestore, onSingleRemove, executeConfirm,
  }
}
