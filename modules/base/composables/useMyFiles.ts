import type { Ref } from 'vue'
import { buildFileData } from '../utils/fileUtils'

/**
 * 我的文件 / 小组文件：状态管理 + 数据加载/上传/重命名/删除/选择器
 */
export function useMyFiles(group: () => string | undefined, open?: Ref<boolean | undefined>, onConfirm?: (files: any[]) => void) {
  const { t } = useI18n()
  const toast = useToast()

  const title = computed(() => group() ? t('coursePanel.groupFiles') : t('myFiles.title'))

  const files = ref<any[]>([])
  const loading = ref(false)
  const total = ref(0)
  const page = ref(1)
  const pageSize = 20
  const keyword = ref('')
  const sortBy = ref('createdAt')
  const sortOrder = ref('desc')

  const selectedIds = ref(new Set<number>())

  const usage = ref({ used: 0, quota: 0, free: 0, unlimited: false })

  const renamingId = ref<number | null>(null)
  const renameValue = ref('')

  const uploading = ref(false)

  const sortOptions = computed(() => [
    { label: t('myFiles.colTime'), value: 'createdAt' },
    { label: t('myFiles.colSize'), value: 'size' },
    { label: t('myFiles.colName'), value: 'name' },
  ])

  const orderIcon = computed(() =>
    sortOrder.value === 'desc' ? 'i-lucide-arrow-down-narrow-wide' : 'i-lucide-arrow-up-wide-narrow',
  )

  function toggleOrder() {
    sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
    loadFiles(1)
  }

  // ========== 数据加载 ==========
  async function loadFiles(targetPage?: number) {
    if (targetPage) page.value = targetPage
    loading.value = true
    try {
      const resp: any = await $fetch('/api/files/list', {
        params: {
          page: page.value,
          pageSize,
          sort: sortBy.value,
          order: sortOrder.value,
          keyword: keyword.value,
          group: group() || undefined,
        },
      })
      if (resp.success && resp.data) {
        files.value = resp.data.list || []
        total.value = resp.data.total || 0
      }
    } catch (e: any) {
      toast.add({ title: e.message || t('myFiles.loadFailed'), color: 'error' })
    } finally {
      loading.value = false
    }
  }

  async function loadUsage() {
    try {
      const resp: any = await $fetch('/api/files/usage')
      if (resp.success) usage.value = resp.data
    } catch { /* noop */ }
  }

  // ========== 上传 ==========
  async function uploadFile(file: File) {
    uploading.value = true
    try {
      const formData = new FormData()
      formData.append('files', file)
      if (group()) formData.append('group', group()!)
      const resp: any = await $fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      })
      if (resp.success) {
        toast.add({ title: t('myFiles.uploadSuccess', { name: file.name }), color: 'success' })
        loadFiles()
      } else {
        toast.add({ title: resp.msg, color: 'error' })
      }
    } catch (e: any) {
      toast.add({ title: e.message || t('myFiles.uploadFailed'), color: 'error' })
    } finally {
      uploading.value = false
    }
  }

  // ========== 重命名 ==========
  function startRename(f: any) {
    renamingId.value = f.id
    renameValue.value = f.name
  }

  function cancelRename() {
    renamingId.value = null
    renameValue.value = ''
  }

  async function confirmRename(f: any) {
    const name = renameValue.value.trim()
    if (!name || name === f.name) { cancelRename(); return }
    try {
      const resp: any = await $fetch('/api/files/rename', {
        method: 'POST',
        body: { id: f.id, name },
      })
      if (resp.success) {
        f.name = name
        toast.add({ title: t('myFiles.renameSuccess'), color: 'success' })
      } else {
        toast.add({ title: resp.msg, color: 'error' })
      }
    } catch (e: any) {
      toast.add({ title: e.message || t('myFiles.renameFailed'), color: 'error' })
    }
    cancelRename()
  }

  // ========== 删除 ==========
  async function remove(f: any) {
    if (!confirm(t('myFiles.confirmDelete', { name: f.name }))) return
    try {
      const resp: any = await $fetch('/api/files/delete', {
        method: 'POST',
        body: { id: f.id },
      })
      if (resp.success) {
        toast.add({ title: t('myFiles.deleteSuccess'), color: 'success' })
        loadFiles()
        if (!group()) loadUsage()
      } else {
        toast.add({ title: resp.msg, color: 'error' })
      }
    } catch (e: any) {
      toast.add({ title: e.message || t('myFiles.deleteFailed'), color: 'error' })
    }
  }

  // ========== 下载 / 预览 ==========
  function download(f: any) {
    const a = document.createElement('a')
    a.href = `/api/files/download?id=${f.id}`
    a.click()
  }

  function preview(f: any) {
    window.open(`/api/files/serve?pathname=${encodeURIComponent(f.path.replace(/^\/+/, ''))}`, '_blank')
  }

  // ========== 选择器模式 ==========
  function pickFile(f: any) {
    onConfirm?.([buildFileData(f)])
  }

  function toggleSelect(f: any, checked: any) {
    if (checked) selectedIds.value.add(f.id)
    else selectedIds.value.delete(f.id)
    selectedIds.value = new Set(selectedIds.value)
  }

  function confirmPickMultiple() {
    const selected = files.value.filter((f) => selectedIds.value.has(f.id)).map(buildFileData)
    if (selected.length) onConfirm?.(selected)
  }

  // ========== 初始化 ==========
  onMounted(() => {
    loadFiles(1)
    if (!group()) loadUsage()
  })

  if (open) {
    watch(open, (val) => {
      if (val) {
        keyword.value = ''
        page.value = 1
        selectedIds.value = new Set()
        loadFiles(1)
        if (!group()) loadUsage()
      }
    })
  }

  watch(group, () => {
    keyword.value = ''
    page.value = 1
    selectedIds.value = new Set()
    loadFiles(1)
  })

  return {
    t,
    title,
    files,
    loading,
    total,
    page,
    pageSize,
    keyword,
    sortBy,
    sortOptions,
    orderIcon,
    selectedIds,
    usage,
    renamingId,
    renameValue,
    uploading,
    uploadFile,
    toggleOrder,
    loadFiles,
    startRename,
    cancelRename,
    confirmRename,
    remove,
    download,
    preview,
    pickFile,
    toggleSelect,
    confirmPickMultiple,
  }
}
