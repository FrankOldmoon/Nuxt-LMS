import type { MenuItem } from '../utils/types'

/**
 * Admin backend left menu: fetch / save / sort
 * Menu is stored in configs table (admin:menu), shared across admins / devices.
 *
 * SSR friendly: uses cRequest.use (i.e. useFetch, forwards Cookie during SSR to fetch and serialize into payload),
 * renders menu directly on SSR, visible after client hydration, no need for onMounted secondary fetch.
 *
 * Implementation note: derived directly from menuData, avoids useState + watch async sync causing items to still be empty during SSR rendering.
 * Editor uses items as local copy initial value; after save, refreshMenu triggers menuData recompute.
 */
export function useAdminMenu() {
  const toast = useToast()
  const { t } = useI18n()

  // SSR + CSR unified source: useFetch auto-deduplicates by URL, shares payload across components
  const {
    data: menuData,
    pending: loadPending,
    refresh: refreshMenu,
  } = cRequest.use<{ items: MenuItem[] }>('/api/admin/menu', {
    server: true,
    lazy: false,
  })

  /**
   * Shared items state (directly syncs menuData → items, ensures computed can read data during SSR rendering).
   * After Editor.save calls refreshMenu → menuData updates → items updates immediately.
   */
  const items = computed<MenuItem[]>(() => (menuData.value as any)?.items || [])

  /** Save (client-side imperative cRequest, not called on SSR) */
  const saving = ref(false)
  async function save(next: MenuItem[]) {
    saving.value = true
    try {
      const config = await cRequest<{ items: MenuItem[] }>('/api/admin/menu', {
        method: 'PUT',
        body: { items: next },
      })
      // Refresh useFetch cache, items computed auto-derives again
      await refreshMenu()
      // Fallback: if server didn't return items (directly use next)
      if (config?.items) {
        // Already updated via refreshMenu; can force assign if not effective
      }
      toast.add({ title: t('admin.menu.saved'), color: 'success' })
    } catch (err: any) {
      toast.add({ title: err?.message || 'save menu failed', color: 'error' })
    } finally {
      saving.value = false
    }
  }

  /** Manual re-fetch (compatible with old callers) */
  async function load() {
    await refreshMenu()
  }

  /** Local-only reorder (real-time feedback during drag, call save when saving) */
  function reorder(next: MenuItem[]) {
    // Local sort does not affect menuData (no request sent before saving); submitted by save(next) when saving
    // Here uses ref instead of directly assigning menuData.value (to avoid conflict with useFetch state)
    // Actually Editor constructs local via treeToFlat, does not depend on reorder
    const newItems = next.map((it, idx) => ({ ...it, order: idx }))
    menuData.value = { items: newItems } as any
  }

  /** Recursively filter visible items, preserving position order (tree) */
  function filterVisible(list: MenuItem[]): MenuItem[] {
    return list
      .filter((i) => i.visible)
      .map((i) => ({
        ...i,
        children: i.children?.length ? filterVisible(i.children) : undefined,
      }))
  }

  /** Visible menu items (tree, array order is the order) */
  const visibleItems = computed(() => filterVisible(items.value))

  /** Combined pending: fetching + saving (used by Editor save button) */
  const pending = computed(() => loadPending.value || saving.value)

  return { items, visibleItems, pending, load, save, reorder, refreshMenu }
}
