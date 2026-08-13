import type { Ref } from 'vue'

const HEADERS = ['username', 'email', 'name', 'password', 'class']
const COL_WIDTHS = { 0: 110, 1: 180, 2: 100, 3: 120, 4: 100 }

/**
 * 批量导入用户：读取表格 + 导入
 */
export function useImportUsers(isOpen: Ref<boolean>) {
  const { t } = useI18n()
  const toast = useToast()

  const sheetRef = ref<any>(null)
  const importing = ref(false)
  const importMsg = ref('')
  const importOk = ref(true)

  async function doImport() {
    importMsg.value = ''
    importOk.value = true

    if (!sheetRef.value) {
      importOk.value = false
      importMsg.value = t('importUsers.notReady')
      return
    }

    const rows = sheetRef.value.getRows()
    if (!rows.length) {
      importOk.value = false
      importMsg.value = t('importUsers.noData')
      return
    }

    const users = rows.map((values: string[]) => ({
      username: values[0],
      email: values[1],
      name: values[2],
      password: values[3],
      class: values[4],
    }))

    importing.value = true
    try {
      const resp: any = await $fetch('/api/users/import', {
        method: 'POST',
        body: { users },
      })
      if (resp.success) {
        importOk.value = true
        importMsg.value = resp.msg
        toast.add({ title: resp.msg, color: 'success' })
        setTimeout(() => sheetRef.value?.reset(), 500)
      } else {
        importOk.value = false
        const errs = resp.data?.errors
        importMsg.value = errs?.length ? errs.slice(0, 5).join('; ') : resp.msg
      }
    } catch (e: any) {
      importOk.value = false
      importMsg.value = e.message || t('importUsers.importFailed')
    } finally {
      importing.value = false
    }
  }

  watch(isOpen, (val) => {
    if (!val) importMsg.value = ''
  })

  return {
    t, sheetRef, importing, importMsg, importOk,
    HEADERS, COL_WIDTHS, doImport,
  }
}
