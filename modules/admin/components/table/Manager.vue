<template>
  <div class="space-y-3">
    <!-- 只读提示 -->
    <UAlert
      v-if="readOnly && !hasFormOverride"
      icon="i-lucide-lock"
      color="warning"
      variant="subtle"
      :title="t('admin.table.readOnly')"
    />

    <!-- 筛选栏 -->
    <TableFilterBar
      :columns="columns"
      :filters="filters"
      :search="search"
      @update:filters="applyFilters"
      @update:search="(v) => applySearch(v)"
    />

    <!-- 工具栏 -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="flex items-center gap-2">
        <UButton
          v-if="canEdit"
          icon="i-lucide-plus"
          color="primary"
          size="xs"
          :label="t('admin.table.add')"
          @click="openAdd"
        />
        <UButton
          icon="i-lucide-upload"
          color="neutral"
          variant="outline"
          size="xs"
          :label="t('admin.table.import')"
          @click="importOpen = true"
        />
        <UButton
          icon="i-lucide-download"
          color="neutral"
          variant="outline"
          size="xs"
          :label="t('admin.table.export')"
          :loading="exporting"
          @click="openExport"
        />
        <TableColumnToggle
          :columns="columns"
          :hidden="hiddenColumns"
          @toggle="toggleColumn"
          @show-all="showAllColumns"
        />
      </div>

      <div class="ml-auto flex items-center gap-2">
        <span class="text-xs text-muted">{{ t('admin.table.total', { count: total }) }}</span>
        <UButton
          :icon="includeDeleted ? 'i-lucide-list' : 'i-lucide-trash'"
          :color="includeDeleted ? 'neutral' : 'error'"
          :variant="includeDeleted ? 'solid' : 'outline'"
          size="xs"
          :label="includeDeleted ? t('admin.table.normal') : t('admin.table.trash')"
          @click="toggleTrash"
        />
      </div>
    </div>

    <!-- 批量工具栏 -->
    <div
      v-if="selectedRows.length > 0"
      class="flex flex-wrap items-center gap-2 p-2 bg-elevated/50 rounded-lg"
    >
      <span class="text-xs font-medium">{{ t('admin.table.selected', { count: selectedRows.length }) }}</span>
      <div class="flex gap-1 ml-auto">
        <template v-if="!includeDeleted">
          <UButton icon="i-lucide-trash-2" color="error" variant="soft" size="xs" :label="t('admin.table.delete')" @click="confirmBatch('delete')" />
        </template>
        <template v-else>
          <UButton icon="i-lucide-rotate-ccw" color="success" variant="soft" size="xs" :label="t('admin.table.restore')" @click="confirmBatch('restore')" />
          <UButton icon="i-lucide-x" color="error" variant="soft" size="xs" :label="t('admin.table.remove')" @click="confirmBatch('remove')" />
        </template>
      </div>
    </div>

    <!-- 表格 -->
    <TableView
      :visible-columns="visibleColumns"
      :rows="rows"
      :selected-keys="selectedKeys"
      :all-selected="allSelected"
      :sort="sort"
      :include-deleted="includeDeleted"
      :can-edit="canEdit"
      :can-delete="canDelete"
      :has-id="hasId"
      :pending="pending"
      :fk-labels="fkLabels"
      :row-key-of="rowKeyOf"
      @sort="toggleSort"
      @toggle-select="toggleSelect"
      @toggle-select-all="toggleSelectAll"
      @view="onView"
      @edit="onEdit"
      @delete="onSingleDelete"
      @restore="onSingleRestore"
      @remove="onSingleRemove"
    />

    <!-- 分页 -->
    <div class="flex items-center justify-between gap-2">
      <USelect
        :model-value="pageSize"
        :items="pageSizeOptions"
        value-key="value"
        size="xs"
        class="w-28"
        @update:model-value="(v: number) => setPageSize(v)"
      />
      <UPagination
        :page="page"
        :total="total"
        :items-per-page="pageSize"
        :sibling-count="1"
        @update:page="setPage"
      />
    </div>

    <!-- 新增 / 编辑表单（仅展示可见列：默认排除时间戳与密码） -->
    <TableCForm
      v-model:open="formOpen"
      :table-name="tableName"
      :columns="visibleColumns"
      :row="editingRow"
      @submit="onFormSubmit"
      @saved="onOverrideSaved"
      @cancel="formOpen = false"
    />

    <!-- 详情预览（仅展示可见列：默认排除时间戳与密码） -->
    <TableCShow
      v-model:open="showOpen"
      :table-name="tableName"
      :columns="visibleColumns"
      :row="viewingRow"
      :fk-labels="fkLabels"
    />

    <!-- 导入 -->
    <TableImportSheet
      v-model:open="importOpen"
      :columns="columns"
      @import="onImport"
    />

    <!-- 导出 -->
    <TableExportSheet
      v-model:open="exportOpen"
      :columns="columns"
      :rows="exportRows"
    />

    <!-- 确认对话框 -->
    <UModal v-model:open="confirmOpen">
      <template #content>
        <div class="p-4">
          <p class="text-sm mb-4">{{ confirmText }}</p>
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" :label="t('admin.form.cancel')" @click="confirmOpen = false" />
            <UButton :color="confirmColor" :label="t('admin.form.save')" :loading="confirmLoading" @click="executeConfirm" />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { ColumnMeta, FilterCondition } from '../../utils/types'

const props = defineProps<{
  tableName: string
}>()

const { t } = useI18n()
const toast = useToast()

const {
  page, pageSize, sort, search, filters, includeDeleted,
  selectedKeys, selectedArray, selectedRows, allSelected, rows, total, pending, meta,
  columns, visibleColumns, hiddenColumns, readOnly, hasId, rowKeyOf,
  toggleColumn, showAllColumns, loadHidden,
  load, toggleSort, applySearch, applyFilters, toggleTrash, setPage, setPageSize,
  toggleSelect, toggleSelectAll,
  addRow, updateRow, batchDelete, batchRemove, batchRestore,
  exportRows: fetchExportRows, importRows,
} = useAdminTable(() => props.tableName)

const { ensure } = useTableMeta(() => props.tableName)
const { hasFormOverride, hasDeleteOverride } = useTableOverride(() => props.tableName)
const canEdit = computed(() => !readOnly.value || hasFormOverride.value)
// canDelete：通用表（hasId + 非只读） 或 注册了 delete 覆盖（如 questions 复合主键表）
const canDelete = computed(() => (hasId.value && !readOnly.value) || hasDeleteOverride.value)

// ====================== FK 标签解析 ======================
const fkLabels = ref<Record<string, Record<number, string>>>({})
const fkColumns = computed(() => columns.value.filter((c) => c.fkTable))

watch(
  () => fkColumns.value.map((c) => `${c.jsName}:${c.fkTable}`).join(','),
  async () => {
    // SSR 不转发 Cookie → 跳过，客户端 hydration 后再拉 FK 选项
    if (import.meta.server) return
    if (fkColumns.value.length === 0) {
      fkLabels.value = {}
      return
    }
    const map: Record<string, Record<number, string>> = {}
    // 去重外表，避免重复请求
    const tableCache: Record<string, Record<number, string>> = {}
    for (const col of fkColumns.value) {
      if (!col.fkTable) continue
      if (!tableCache[col.fkTable]) {
        try {
          const opts = await cRequest<{ id: number; label: string }[]>(
            `/api/admin/fk-options?table=${col.fkTable}&label=${col.fkLabel || ''}`,
          )
          const lookup: Record<number, string> = {}
          for (const o of opts || []) lookup[o.id] = o.label
          tableCache[col.fkTable] = lookup
        } catch {
          tableCache[col.fkTable] = {}
        }
      }
      map[col.jsName] = tableCache[col.fkTable]
    }
    fkLabels.value = map
  },
  { immediate: true },
)

// ====================== 初始化 / 切表 ======================
watch(
  () => props.tableName,
  async () => {
    await ensure()
    await loadHidden()
    page.value = 1
    sort.value = null
    search.value = ''
    filters.value = []
    includeDeleted.value = false
    await load()
  },
  { immediate: true },
)

const pageSizeOptions = [
  { label: '10', value: 10 },
  { label: '20', value: 20 },
  { label: '50', value: 50 },
  { label: '100', value: 100 },
]

// ====================== 表单 ======================
const formOpen = ref(false)
const editingRow = ref<Record<string, any> | null>(null)

function openAdd() {
  editingRow.value = null
  formOpen.value = true
}

function onEdit(row: Record<string, any>) {
  editingRow.value = row
  formOpen.value = true
}

async function onFormSubmit(data: Record<string, any>) {
  if (editingRow.value && hasId.value) {
    await updateRow(editingRow.value.id, data)
  } else {
    await addRow(data)
  }
}

/** 覆盖表单（如 question edit.vue）保存后回调：关闭弹窗 + 刷新列表 */
async function onOverrideSaved() {
  formOpen.value = false
  await load()
}

// ====================== 详情预览 ======================
const showOpen = ref(false)
const viewingRow = ref<Record<string, any> | null>(null)

function onView(row: Record<string, any>) {
  viewingRow.value = row
  showOpen.value = true
}

// ====================== 导入 ======================
const importOpen = ref(false)

async function onImport(rowsData: Record<string, any>[]) {
  importOpen.value = false
  const result = await importRows(rowsData)
  if (result.errors.length) {
    toast.add({ title: t('admin.table.imported', { inserted: result.inserted }), color: 'warning' })
  } else {
    toast.add({ title: t('admin.table.imported', { inserted: result.inserted }), color: 'success' })
  }
}

// ====================== 导出 ======================
const exportOpen = ref(false)
const exportRows = ref<Record<string, any>[]>([])
const exporting = ref(false)

async function openExport() {
  exporting.value = true
  try {
    exportRows.value = await fetchExportRows()
    exportOpen.value = true
  } catch (err: any) {
    toast.add({ title: err?.message || 'export failed', color: 'error' })
  } finally {
    exporting.value = false
  }
}

// ====================== 确认对话框（删除 / 恢复 / 彻底删除） ======================
const confirmOpen = ref(false)
const confirmAction = ref<'delete' | 'remove' | 'restore'>('delete')
const confirmRows = ref<Record<string, any>[]>([])
const confirmLoading = ref(false)

const confirmText = computed(() => {
  const count = confirmRows.value.length
  if (confirmAction.value === 'delete') return t('admin.table.confirmDelete', { count })
  if (confirmAction.value === 'remove') return t('admin.table.confirmRemove', { count })
  return t('admin.table.confirmRestore', { count })
})

const confirmColor = computed(() =>
  confirmAction.value === 'restore' ? 'success' : 'error',
)

function confirmBatch(action: 'delete' | 'remove' | 'restore') {
  confirmAction.value = action
  confirmRows.value = [...selectedRows.value]
  confirmOpen.value = true
}

function onSingleDelete(row: Record<string, any>) {
  confirmAction.value = 'delete'
  confirmRows.value = [row]
  confirmOpen.value = true
}

function onSingleRestore(row: Record<string, any>) {
  confirmAction.value = 'restore'
  confirmRows.value = [row]
  confirmOpen.value = true
}

function onSingleRemove(row: Record<string, any>) {
  confirmAction.value = 'remove'
  confirmRows.value = [row]
  confirmOpen.value = true
}

async function executeConfirm() {
  confirmLoading.value = true
  try {
    if (confirmAction.value === 'delete') await batchDelete(confirmRows.value)
    else if (confirmAction.value === 'remove') await batchRemove(confirmRows.value)
    else await batchRestore(confirmRows.value)
    confirmOpen.value = false
  } finally {
    confirmLoading.value = false
  }
}
</script>
