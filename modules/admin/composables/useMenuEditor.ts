import type { Ref } from 'vue'
import type { MenuItem } from '../utils/types'
import type { FlatMenuItem } from '../components/menu/EditorItem.vue'

/**
 * Menu editor: manages local flat copy, tree↔flat conversion, single item edit orchestration, save
 */
export function useMenuEditor(open: Ref<boolean>, emit: (e: 'update:open', v: boolean) => void) {
  const { items, save, pending } = useAdminMenu()
  const { tables, load: loadTables } = useTablesMeta()

  const local = ref<FlatMenuItem[]>([])
  let keyCounter = 0
  function genKey(): number {
    return keyCounter++
  }

  // ==================== Tree ↔ flat conversion ====================
  function treeToFlat(list: MenuItem[], depth = 0): FlatMenuItem[] {
    const result: FlatMenuItem[] = []
    for (const it of list) {
      result.push({
        _key: genKey(),
        table: it.table,
        label: it.label || '',
        visible: it.visible !== false,
        icon: it.icon,
        to: it.to,
        depth,
      })
      if (it.children?.length) result.push(...treeToFlat(it.children, depth + 1))
    }
    return result
  }

  function flatToTree(flat: FlatMenuItem[]): MenuItem[] {
    const root: MenuItem[] = []
    const stack: MenuItem[] = []
    for (const f of flat) {
      const node: MenuItem = {
        table: f.table,
        label: f.label || (f.table ? f.table : 'Group'),
        visible: f.visible,
        icon: f.icon,
        to: f.to,
        order: 0,
        children: [],
      }
      while (stack.length > f.depth) stack.pop()
      if (stack.length === 0) {
        root.push(node)
      } else {
        stack[stack.length - 1]!.children!.push(node)
      }
      stack.push(node)
    }
    function clean(list: MenuItem[]) {
      list.forEach((it, i) => {
        it.order = i
        if (it.children && it.children.length > 0) {
          clean(it.children)
        } else {
          delete it.children
        }
      })
    }
    clean(root)
    return root
  }

  // ==================== Single item edit orchestration ====================
  const itemEditOpen = ref(false)
  const editingIndex = ref<number>(-1)
  const editingItem = computed<FlatMenuItem | null>(() =>
    editingIndex.value >= 0 && editingIndex.value < local.value.length
      ? local.value[editingIndex.value]!
      : null,
  )

  function openItemEdit(idx: number) {
    editingIndex.value = idx
    itemEditOpen.value = true
  }

  function onItemConfirm(updated: Partial<FlatMenuItem>) {
    const idx = editingIndex.value
    if (idx < 0) return
    local.value = local.value.map((it, i) => (i === idx ? { ...it, ...updated } : it))
  }

  // ==================== Main modal: initialize / save ====================
  function resetFromItems() {
    keyCounter = 0
    local.value = treeToFlat(items.value)
  }

  watch(open, async (v) => {
    if (v) {
      keyCounter = 0
      if (tables.value.length === 0) await loadTables()
      local.value = treeToFlat(items.value)
    }
  })

  async function onSave() {
    await save(flatToTree(local.value))
    emit('update:open', false)
  }

  return {
    items,
    tables,
    local,
    genKey,
    pending,
    resetFromItems,
    onSave,
    itemEditOpen,
    editingItem,
    openItemEdit,
    onItemConfirm,
  }
}
