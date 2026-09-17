import type { Ref } from 'vue'

interface NotificationItem {
  id: number
  name: string
  content: { text?: string } | null
  /** 附加数据：广播为 { type: 'broadcast' }；系统定向通知为 { type: 'homeworkGraded' | 'commentApproved', ... } */
  data?: Record<string, any> | null
  readAt: string | null
  createdAt: string
}

interface NotificationList {
  items: NotificationItem[]
  total: number
  page: number
  pageSize: number
}

/**
 * 通知弹窗：分页加载 + 刷新
 */
export function useNotifications(isOpen: Ref<boolean>) {
  const { t } = useI18n()
  const page = ref(1)
  const pageSize = 10

  const url = computed(() => `/api/notifications/list?page=${page.value}&pageSize=${pageSize}`)

  const { data: list, pending, refresh } = cRequest.use<NotificationList>(
    url,
    { default: () => null, watch: [page], immediate: false },
  )

  watch(isOpen, (val) => {
    if (val) {
      page.value = 1
      refresh()
    }
  })

  function formatTime(ts: string) {
    return new Date(ts).toLocaleString()
  }

  return { t, page, list, pending, formatTime, refresh }
}
