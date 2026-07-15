/**
 * useMenuEditor composable tests
 * @see modules/admin/composables/useMenuEditor.ts
 *
 * Menu editor: tree↔flat conversion, single item edit orchestration, save
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'
import { ref, nextTick } from 'vue'

beforeEach(() => {
  resetAllStubs()
  // useMenuEditor internally calls useAdminMenu() and useTablesMeta() (admin auto-imports)
  // Inject stubs into globalThis for testing
  ;(globalThis as any).useAdminMenu = () => ({
    items: ref([
      { label: 'Users', table: 'users', visible: true, order: 0, children: [
        { label: 'Child', table: 'child', visible: true, order: 0 },
      ] },
    ]),
    save: vi.fn().mockResolvedValue(undefined),
    pending: ref(false),
  })
  ;(globalThis as any).useTablesMeta = () => ({
    tables: ref([{ name: 'users', columns: [{ jsName: 'id' }] }]),
    load: vi.fn().mockResolvedValue(undefined),
  })
})

describe('composables/useMenuEditor', () => {
  it('open 时从 items 初始化 local 扁平列表', async () => {
    const { useMenuEditor } = await import('../../composables/useMenuEditor')
    const open = ref(false)
    const emit = vi.fn()
    const { local } = useMenuEditor(open, emit)
    open.value = true
    await nextTick()
    expect(local.value.length).toBeGreaterThan(0)
    expect(local.value[0].depth).toBe(0)
    expect(local.value[1].depth).toBe(1)
  })

  it('openItemEdit 设置 editingIndex 并打开弹窗', async () => {
    const { useMenuEditor } = await import('../../composables/useMenuEditor')
    const open = ref(false)
    const { itemEditOpen, editingItem, openItemEdit } = useMenuEditor(open, vi.fn())
    open.value = true
    await nextTick()
    openItemEdit(0)
    expect(itemEditOpen.value).toBe(true)
    expect(editingItem.value).toBeTruthy()
    expect(editingItem.value?.label).toBe('Users')
  })

  it('onItemConfirm 更新对应索引的项', async () => {
    const { useMenuEditor } = await import('../../composables/useMenuEditor')
    const open = ref(false)
    const { local, openItemEdit, onItemConfirm } = useMenuEditor(open, vi.fn())
    open.value = true
    await nextTick()
    openItemEdit(0)
    onItemConfirm({ label: 'New' })
    expect(local.value[0].label).toBe('New')
  })

  it('onSave 调用 save 并关闭弹窗', async () => {
    const { useMenuEditor } = await import('../../composables/useMenuEditor')
    const open = ref(false)
    const emit = vi.fn()
    const { onSave } = useMenuEditor(open, emit)
    open.value = true
    await nextTick()
    await onSave()
    expect(emit).toHaveBeenCalledWith('update:open', false)
  })

  it('genKey 递增', async () => {
    const { useMenuEditor } = await import('../../composables/useMenuEditor')
    const { genKey } = useMenuEditor(ref(false), vi.fn())
    const k1 = genKey()
    const k2 = genKey()
    expect(k2).toBe(k1 + 1)
  })
})
