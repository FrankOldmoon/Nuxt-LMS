/**
 * useEditorItemDrafts composable tests
 * @see modules/admin/composables/useEditorItemDrafts.ts
 *
 * Menu item edit draft: manages working copy of label/icon/to/table/visible
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'
import { ref, nextTick } from 'vue'

beforeEach(() => {
  resetAllStubs()
})

describe('composables/useEditorItemDrafts', () => {
  it('open 变 true 时从 item 初始化草稿', async () => {
    const { useEditorItemDrafts } = await import('../../composables/useEditorItemDrafts')
    const open = ref(false)
    const item = ref({ label: 'Home', icon: 'i-lucide-home', to: '/home', table: 'users', visible: true, _key: 0, depth: 0 })
    const { labelDraft, iconDraft, toDraft, tableDraft, visibleDraft } = useEditorItemDrafts(
      () => open.value, () => item.value,
    )
    open.value = true
    await nextTick()
    expect(labelDraft.value).toBe('Home')
    expect(iconDraft.value).toBe('i-lucide-home')
    expect(toDraft.value).toBe('/home')
    expect(tableDraft.value).toBe('users')
    expect(visibleDraft.value).toBe(true)
  })

  it('item 为 null 时不初始化', async () => {
    const { useEditorItemDrafts } = await import('../../composables/useEditorItemDrafts')
    const open = ref(false)
    const item = ref(null)
    const { labelDraft } = useEditorItemDrafts(() => open.value, () => item.value)
    open.value = true
    await nextTick()
    expect(labelDraft.value).toBe('')
  })

  it('buildPatch: 空 icon/to 转为 undefined', async () => {
    const { useEditorItemDrafts } = await import('../../composables/useEditorItemDrafts')
    const open = ref(false)
    const item = ref({ label: 'Test', icon: '', to: '', table: 'users', visible: true, _key: 0, depth: 0 })
    const { buildPatch } = useEditorItemDrafts(() => open.value, () => item.value)
    open.value = true
    await nextTick()
    const patch = buildPatch()
    expect(patch.icon).toBeUndefined()
    expect(patch.to).toBeUndefined()
    expect(patch.table).toBe('users')
    expect(patch.visible).toBe(true)
  })

  it('buildPatch: 空 label 回退到 table 或 Group', async () => {
    const { useEditorItemDrafts } = await import('../../composables/useEditorItemDrafts')
    const open = ref(false)
    const item = ref({ label: '', icon: '', to: '', table: 'courses', visible: true, _key: 0, depth: 0 })
    const { labelDraft, buildPatch } = useEditorItemDrafts(() => open.value, () => item.value)
    open.value = true
    await nextTick()
    labelDraft.value = '   '
    const patch = buildPatch()
    expect(patch.label).toBe('courses')
  })

  it('buildPatch: 无 table 时 label 回退到 Group', async () => {
    const { useEditorItemDrafts } = await import('../../composables/useEditorItemDrafts')
    const open = ref(false)
    const item = ref({ label: '', icon: '', to: '', table: undefined, visible: true, _key: 0, depth: 0 })
    const { labelDraft, buildPatch } = useEditorItemDrafts(() => open.value, () => item.value)
    open.value = true
    await nextTick()
    labelDraft.value = ''
    const patch = buildPatch()
    expect(patch.label).toBe('Group')
  })
})
