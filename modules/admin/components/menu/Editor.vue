<template>
  <!-- 主编辑弹窗：菜单树（navEditor 风格） -->
  <UModal v-model:open="open" :ui="{ content: 'max-w-2xl' }">
    <template #content>
      <div class="p-4 min-w-[560px]">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-base font-semibold">{{ t('admin.menu.edit') }}</h3>
          <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="open = false" />
        </div>
        <p class="text-xs text-muted mb-3">{{ t('admin.menu.editorHint2') }}</p>

        <!-- 菜单树：折叠/展开 + 同层级拖拽 -->
        <div class="max-h-[55vh] overflow-y-auto pr-1">
          <MenuEditorList
            v-model="local"
            :gen-key="genKey"
            :max-depth="2"
            @open-edit="openItemEdit"
          />
        </div>

        <div class="flex justify-between gap-2 mt-4">
          <UButton color="neutral" variant="ghost" :label="t('admin.menu.cancel')" @click="open = false" />
          <div class="flex gap-2">
            <UButton color="neutral" variant="outline" :label="t('admin.menu.reset')" @click="resetFromItems" />
            <UButton color="primary" :label="t('admin.menu.saveAndClose')" :loading="pending" @click="onSave" />
          </div>
        </div>
      </div>
    </template>
  </UModal>

  <!-- 二级：单条菜单项编辑弹窗（独立 UModal） -->
  <UModal v-model:open="itemEditOpen" :ui="{ content: 'max-w-md' }">
    <template #content>
      <div class="p-4 space-y-3 min-w-[420px]">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold">{{ t('admin.menu.editItem') }}</h3>
          <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="itemEditOpen = false" />
        </div>

        <UFormField :label="t('admin.menu.label')" required>
          <UInput v-model="editingItem.label" size="sm" class="w-full" :placeholder="t('admin.menu.label')" />
        </UFormField>

        <UFormField :label="t('admin.menu.icon')" :description="t('admin.menu.iconDesc')">
          <UInput
            v-model="iconDraft"
            size="sm"
            class="w-full"
            :placeholder="t('admin.menu.iconPlaceholder')"
          >
            <template #leading>
              <UIcon v-if="iconDraft" :name="iconDraft" class="size-4 text-muted" />
            </template>
          </UInput>
        </UFormField>

        <UFormField :label="t('admin.menu.to')" :description="t('admin.menu.toDesc')">
          <UInput
            v-model="toDraft"
            size="sm"
            class="w-full"
            :placeholder="t('admin.menu.toPlaceholder')"
          />
        </UFormField>

        <UFormField :label="t('admin.menu.selectTable')" :description="t('admin.menu.tableDesc')">
          <USelectMenu
            :model-value="editingItem.table || GROUP_VALUE"
            :items="tableItems"
            value-key="value"
            option-attribute="label"
            :placeholder="t('admin.menu.selectTable')"
            size="sm"
            class="w-full"
            @update:model-value="(v: any) => (editingItem.table = !v || v === GROUP_VALUE ? undefined : v)"
          />
        </UFormField>

        <UFormField :label="t('admin.menu.visible')">
          <USwitch v-model="editingItem.visible" />
        </UFormField>

        <div class="flex justify-end gap-2 pt-2">
          <UButton color="neutral" variant="ghost" :label="t('admin.menu.cancel')" @click="itemEditOpen = false" />
          <UButton color="primary" :label="t('admin.menu.saveAndClose')" @click="confirmItemEdit" />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { MenuItem } from '../../utils/types'
import type { FlatMenuItem } from './EditorItem.vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [v: boolean] }>()
const { items, save, pending } = useAdminMenu()
const { tables, load: loadTables } = useTablesMeta()
const { t } = useI18n()

const open = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v),
})

// 本地扁平副本（带 depth）
const local = ref<FlatMenuItem[]>([])
let keyCounter = 0
function genKey(): number {
  return keyCounter++
}

// 表选项（含「分组」占位项：value 不能为空字符串，否则 USelectMenu 内部 ComboboxItem 校验报错）
const GROUP_VALUE = '__group__'
const tableItems = computed(() => [
  { label: t('admin.menu.group'), value: GROUP_VALUE },
  ...tables.value.map((tb) => ({ label: tb.name, value: tb.name })),
])

// ==================== 树 ↔ 扁平 转换 ====================
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
  const stack: MenuItem[] = [] // stack[depth] = 当前各层父节点
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

// ==================== 单条编辑弹窗 ====================
const itemEditOpen = ref(false)
const editingIndex = ref<number>(-1)
/** 编辑弹窗内的工作副本（直接修改 local 中的同一对象，关闭时随 local 一起保存） */
const editingItem = reactive<FlatMenuItem>({
  _key: -1,
  label: '',
  visible: true,
  depth: 0,
})
/** icon / to 字符串草稿（空字符串代表「清空」, 提交时转为 undefined） */
const iconDraft = ref('')
const toDraft = ref('')

function openItemEdit(idx: number) {
  if (idx < 0 || idx >= local.value.length) return
  const src = local.value[idx]!
  // 浅拷贝副本（编辑中改动直到用户点 Save 才同步到 local）
  editingIndex.value = idx
  editingItem._key = src._key
  editingItem.table = src.table
  editingItem.label = src.label
  editingItem.visible = src.visible
  editingItem.icon = src.icon
  editingItem.to = src.to
  editingItem.depth = src.depth
  iconDraft.value = src.icon || ''
  toDraft.value = src.to || ''
  itemEditOpen.value = true
}

function confirmItemEdit() {
  if (editingIndex.value < 0) {
    itemEditOpen.value = false
    return
  }
  const idx = editingIndex.value
  const newLabel = editingItem.label.trim() || (editingItem.table || 'Group')
  const newIcon = iconDraft.value.trim() || undefined
  const newTo = toDraft.value.trim() || undefined
  // 同步到 local（替换该 index 的对象，确保响应式触发）
  local.value = local.value.map((it, i) =>
    i === idx
      ? {
          ...it,
          label: newLabel,
          visible: editingItem.visible,
          table: editingItem.table,
          icon: newIcon,
          to: newTo,
        }
      : it,
  )
  itemEditOpen.value = false
}

// ==================== 主弹窗：初始化 / 保存 ====================
function resetFromItems() {
  keyCounter = 0
  local.value = treeToFlat(items.value)
}

watch(
  () => props.open,
  async (v) => {
    if (v) {
      keyCounter = 0
      if (tables.value.length === 0) await loadTables()
      local.value = treeToFlat(items.value)
    }
  },
)

async function onSave() {
  await save(flatToTree(local.value))
  emit('update:open', false)
}
</script>
