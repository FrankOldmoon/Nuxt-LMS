import type { MenuItem } from '../utils/types'

/**
 * 后台左侧菜单：拉取 / 保存 / 排序
 * 菜单存储于 configs 表（admin:menu），跨管理员 / 设备共享。
 *
 * SSR 友好：使用 cRequest.use（即 useFetch，SSR 期转发 Cookie 拉取并序列化到 payload），
 * 直接 SSR 渲染菜单，客户端 hydration 后即可见，不再需要 onMounted 二次拉取。
 *
 * 实现要点：直接派生自 menuData，避免 useState + watch 异步同步导致 SSR 渲染时 items 仍为空。
 * Editor 用 items 做本地副本初始值；save 后 refreshMenu 触发 menuData 重新计算。
 */
export function useAdminMenu() {
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

  /**
   * 共享 items 状态（直接同步 menuData → items，确保 SSR 渲染期 computed 已可读到数据）。
   * Editor.save 后调 refreshMenu → menuData 更新 → items 立即更新。
   */
  const items = computed<MenuItem[]>(() => (menuData.value as any)?.items || [])

  /** 保存（客户端命令式 cRequest，SSR 不调用） */
  const saving = ref(false)
  async function save(next: MenuItem[]) {
    saving.value = true
    try {
      const config = await cRequest<{ items: MenuItem[] }>('/api/admin/menu', {
        method: 'PUT',
        body: { items: next },
      })
      // 刷新 useFetch 缓存，items computed 自动重新派生
      await refreshMenu()
      // 兜底：若 server 没回 items（直接用 next）
      if (config?.items) {
        // 已通过 refreshMenu 更新；如未生效可强制赋值
      }
      toast.add({ title: t('admin.menu.saved'), color: 'success' })
    } catch (err: any) {
      toast.add({ title: err?.message || 'save menu failed', color: 'error' })
    } finally {
      saving.value = false
    }
  }

  /** 手动重拉（兼容旧调用） */
  async function load() {
    await refreshMenu()
  }

  /** 仅本地重排（拖拽时实时反馈，保存时调 save） */
  function reorder(next: MenuItem[]) {
    // 本地排序不影响 menuData（保存前不发请求）；保存时由 save(next) 提交
    // 这里用 ref 而非 menuData.value 直接赋值（避免与 useFetch 状态冲突）
    // 实际 Editor 通过 treeToFlat 构造 local，不依赖 reorder
    const newItems = next.map((it, idx) => ({ ...it, order: idx }))
    if (menuData.value) {
      ;(menuData.value as any) = { items: newItems }
    } else {
      menuData.value = { items: newItems } as any
    }
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
