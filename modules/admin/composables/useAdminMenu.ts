import type { MenuItem } from '../utils/types'

/**
 * 后台左侧菜单：拉取 / 保存 / 排序
 * 菜单存储于 configs 表（admin:menu），跨管理员 / 设备共享。
 *
 * SSR 友好：使用 cRequest.use（即 useFetch，SSR 期转发 Cookie 拉取并序列化到 payload），
 * 直接 SSR 渲染菜单，客户端 hydration 后即可见，不再需要 onMounted 二次拉取。
 */
export function useAdminMenu() {
  const items = useState<MenuItem[]>('admin:menu-items', () => [])
  const toast = useToast()
  const { t } = useI18n()

  // SSR + CSR 统一来源：useFetch 自动按 URL 去重，跨组件共享 payload
  const {
    data: menuData,
    pending: loadPending,
    refresh: refreshMenu,
  } = cRequest.use<{ items: MenuItem[] }>('/api/admin/menu', {
    server: true,
    lazy: false,
  })

  // payload → 共享 state（Editor/Navigation 共用）
  watch(
    menuData,
    (v) => {
      items.value = (v as any)?.items || []
    },
    { immediate: true },
  )

  /** 保存（客户端命令式 cRequest，SSR 不调用） */
  const saving = ref(false)
  async function save(next: MenuItem[]) {
    saving.value = true
    try {
      const config = await cRequest<{ items: MenuItem[] }>('/api/admin/menu', {
        method: 'PUT',
        body: { items: next },
      })
      items.value = config?.items || next
      // 刷新 useFetch 缓存，保证下次组件进入或客户端导航拿到最新数据
      await refreshMenu()
      toast.add({ title: t('admin.menu.saved'), color: 'success' })
    } catch (err: any) {
      toast.add({ title: err?.message || 'save menu failed', color: 'error' })
    } finally {
      saving.value = false
    }
  }

  /** 手动重拉（load 兼容旧调用，Editor 偶发需要强制刷新） */
  async function load() {
    await refreshMenu()
  }

  /** 仅本地重排（拖拽时实时反馈，保存时调 save） */
  function reorder(next: MenuItem[]) {
    items.value = next.map((it, idx) => ({ ...it, order: idx }))
  }

  /** 递归过滤可见项，保留位置顺序（树形） */
  function filterVisible(list: MenuItem[]): MenuItem[] {
    return list
      .filter((i) => i.visible)
      .map((i) => ({
        ...i,
        children: i.children?.length ? filterVisible(i.children) : undefined,
      }))
  }

  /** 可见的菜单项（树形，按数组顺序即 order） */
  const visibleItems = computed(() => filterVisible(items.value))

  /** 合并的 pending：拉取中 + 保存中（Editor 保存按钮用） */
  const pending = computed(() => loadPending.value || saving.value)

  return { items, visibleItems, pending, load, save, reorder, refreshMenu }
}
