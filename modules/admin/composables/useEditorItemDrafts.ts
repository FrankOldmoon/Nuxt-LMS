import type { FlatMenuItem } from '../components/menu/EditorItem.vue'

/**
 * 菜单项编辑草稿：管理 label/icon/to/table/visible 的工作副本
 * （icon/to 空字符串代表「清空」, 提交时转为 undefined）
 */
export function useEditorItemDrafts(
  open: () => boolean,
  item: () => FlatMenuItem | null,
) {
  const labelDraft = ref('')
  const iconDraft = ref('')
  const toDraft = ref('')
  const tableDraft = ref<string | undefined>(undefined)
  const visibleDraft = ref(true)

  watch(open, (v) => {
    if (v) {
      const src = item()
      if (!src) return
      labelDraft.value = src.label
      iconDraft.value = src.icon || ''
      toDraft.value = src.to || ''
      tableDraft.value = src.table
      visibleDraft.value = src.visible
    }
  })

  function buildPatch(): Partial<FlatMenuItem> {
    return {
      label: labelDraft.value.trim() || (tableDraft.value || 'Group'),
      icon: iconDraft.value.trim() || undefined,
      to: toDraft.value.trim() || undefined,
      table: tableDraft.value,
      visible: visibleDraft.value,
    }
  }

  return { labelDraft, iconDraft, toDraft, tableDraft, visibleDraft, buildPatch }
}
