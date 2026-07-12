import { ref } from 'vue'

export function useNav() {
  const { hasRole } = useAuth()
  const { links, refresh } = useHeaderNav()
  const toast = useToast()
  const { t } = useI18n()

  const importing = ref(false)
  const fileInputRef = ref<HTMLInputElement | null>(null)

  /**
   * 导航保存后刷新：
   * - 主要靠服务端广播 'home-changed'（categories/courses add|update|batch|delete|import）
   *   → useHome() 内部 WS handler 触发 refreshNuxtData('home-singleton-fetch')
   *   → 所有 useHeaderNav / pages/index.vue / 其他 useHome() 消费者实时更新
   * - 此处再调用一次 refresh() 作为兜底（防止 WS 未连接或广播丢失）
   */
  async function handleSaved() {
    if (refresh) {
      await refresh()
    }
  }

  /** 触发文件选择 */
  function triggerFilePicker() {
    fileInputRef.value?.click()
  }

  /**
   * 选择文件后：
   * 1. 解析 JSON
   * 2. 调用 /api/courses/import
   * 3. 成功后弹 toast，刷新导航
   */
  async function onFileSelected(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    // 清空 value，允许重复选择同一文件
    input.value = ''
    if (!file) return

    if (!file.name.endsWith('.json')) {
      toast.add({
        title: t('navEditor.importFailed'),
        description: t('navEditor.selectFile'),
        color: 'error',
      })
      return
    }

    importing.value = true
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const result = await cRequest<any>('/api/courses/import', {
        method: 'POST',
        body: { data },
      })
      const summary = result
        ? `${result.chapters ?? 0} chapters, ${result.questions ?? 0} questions, ${result.homeworks ?? 0} homeworks, ${result.comments ?? 0} comments`
        : ''
      toast.add({
        title: t('navEditor.importSuccess'),
        description: summary,
        color: 'success',
      })
      // 刷新顶部导航，让新课程显示出来
      if (refresh) await refresh()
    } catch (err: any) {
      toast.add({
        title: t('navEditor.importFailed'),
        description: err?.message || String(err),
        color: 'error',
      })
    } finally {
      importing.value = false
    }
  }

  return {
    hasRole, links, handleSaved, importing, triggerFilePicker, fileInputRef, onFileSelected,
  }
}
