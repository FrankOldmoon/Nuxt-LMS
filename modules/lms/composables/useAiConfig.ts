/**
 * useAiConfig — AI assistant config composable (SSR compatible)
 *
 * Fetch lms_config.ai group (mode/model/thinking/apiUrl/title/preset/opening/ttsGender).
 * - Fetch config during SSR, serialize to page payload, client hydration restores directly
 * - Multiple components share the same useFetch cache (key='lms-ai-config')
 * - Call refreshAiConfig to refresh cache after config update
 */
export function useAiConfig() {
  const { data, status, refresh } = useFetch('/api/config/ai', {
    server: true,
    lazy: false,
    key: 'lms-ai-config',
    transform: (raw: any) => {
      if (raw && raw.success && raw.data) return raw.data
      return null
    },
    default: () => null,
  })

  const aiConfig = computed(() => data.value || {})
  const isLoading = computed(() => status.value === 'pending')

  async function refreshAiConfig() {
    await refresh()
  }

  return { aiConfig, isLoading, refreshAiConfig }
}
