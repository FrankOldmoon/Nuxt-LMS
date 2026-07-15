import { ref } from 'vue'

export function useNav() {
  const { hasRole } = useAuth()
  const { links, refresh } = useHeaderNav()
  const toast = useToast()
  const { t } = useI18n()

  const importing = ref(false)
  const fileInputRef = ref<HTMLInputElement | null>(null)

  /**
   * Navigation saveBackRefresh：
   * - mainly by Serverserver broadcast 'home-changed'（categories/courses add|update|batch|delete|import）
   *   → useHome() Inside WS handler Trigger refreshNuxtData('home-singleton-fetch')
   *   → All useHeaderNav / pages/index.vue / Other useHome() consumers real-timeUpdate
   * - thislocationthenCallonetimes refresh() as fallbackBottom（prevent WS notConnectionorbroadcast lost）
   */
  async function handleSaved() {
    if (refresh) {
      await refresh()
    }
  }

  /** TriggerFile Selection */
  function triggerFilePicker() {
    fileInputRef.value?.click()
  }

  /**
   * Select FileBack：
   * 1. Analysis JSON
   * 2. Call /api/courses/import
   * 3. SuccessBackpopup toast，RefreshNavigation
   */
  async function onFileSelected(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    // Clear value，AllowHeavyduplicateSelectsameoneFile
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
      // RefreshTop Navigation，letNewCourseShowshow
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
    hasRole, links, handle saved, importing, triggerFilePicker, fileInputRef, onFileSelected,
  }
}
