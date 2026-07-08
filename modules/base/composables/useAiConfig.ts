/**
 * useAiConfig — AI 助手配置组合式函数（SSR 兼容）
 *
 * 获取 lms_config.ai 分组（mode/model/thinking/apiUrl/title/preset/opening/ttsGender）。
 * - SSR 阶段即获取配置，序列化到页面 payload，客户端 hydration 直接还原
 * - 多组件共享同一份 useFetch 缓存（key='lms-ai-config'）
 * - 配置更新后调用 refreshAiConfig 刷新缓存
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
