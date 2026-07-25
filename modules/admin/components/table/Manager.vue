<template>
  <div class="space-y-3">
    <UAlert v-if="readOnly && !hasFormOverride" icon="i-lucide-lock" color="warning" variant="subtle" :title="t('admin.table.readOnly')" />

    <TableFilterBar :columns="columns" :filters="filters" :search="search" @update:filters="applyFilters" @update:search="(v) => applySearch(v)" />

    <ManagerToolbar
      :can-edit="canEdit" :exporting="exporting" :include-deleted="includeDeleted"
      :total="total" :columns="columns" :hidden-columns="hiddenColumns"
      @add="openAdd" @import="importOpen = true" @export="openExport"
      @toggle-column="toggleColumn" @show-all="showAllColumns" @toggle-trash="toggleTrash"
    />

    <ManagerBatchBar :selected-rows="selectedRows" :include-deleted="includeDeleted" @batch="(a) => confirmBatch(a, selectedRows)" />

    <TableView
      :visible-columns="visibleColumns" :rows="rows" :selected-keys="selectedKeys"
      :all-selected="allSelected" :sort="sort" :include-deleted="includeDeleted"
      :can-edit="canEdit" :can-delete="canDelete" :has-id="hasId" :pending="pending"
      :fk-labels="fkLabels" :row-key-of="rowKeyOf"
      @sort="toggleSort" @toggle-select="toggleSelect" @toggle-select-all="toggleSelectAll"
      @view="onView" @edit="onEdit" @delete="onSingleDelete" @restore="onSingleRestore" @remove="onSingleRemove"
    />

    <ManagerPagination :page="page" :page-size="pageSize" :total="total" @set-page="setPage" @set-page-size="setPageSize" />

    <TableCForm v-model:open="formOpen" :table-name="tableName" :columns="visibleColumns" :row="editingRow" @submit="onFormSubmit" @saved="onOverrideSaved" @cancel="formOpen = false" />
    <TableCShow v-model:open="showOpen" :table-name="tableName" :columns="visibleColumns" :row="viewingRow" :fk-labels="fkLabels" />
    <TableImportSheet v-model:open="importOpen" :columns="columns" @import="onImport" />
    <TableExportSheet v-model:open="exportOpen" :columns="columns" :rows="exportRows" />

    <ManagerConfirmDialog v-model:open="confirmOpen" :text="confirmText" :color="confirmColor" :loading="confirmLoading" @confirm="executeConfirm" />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ tableName: string }>()
const { t } = useI18n()

const {
  page, pageSize, sort, search, filters, includeDeleted,
  selectedKeys, selectedRows, allSelected, rows, total, pending,
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
const canDelete = computed(() => (hasId.value && !readOnly.value) || hasDeleteOverride.value)

const { fkLabels } = useFkLabels(columns)

// 初始化 / 切表
watch(() => props.tableName, async () => {
  await ensure()
  await loadHidden()
  page.value = 1; sort.value = null; search.value = ''
  filters.value = []; includeDeleted.value = false
  await load()
}, { immediate: true })

// 表单
const formOpen = ref(false)
const editingRow = ref<Record<string, any> | null>(null)
const openAdd = () => { editingRow.value = null; formOpen.value = true }
const onEdit = (row: Record<string, any>) => { editingRow.value = row; formOpen.value = true }
const onFormSubmit = async (data: Record<string, any>) => {
  if (editingRow.value && hasId.value) await updateRow(editingRow.value.id, data)
  else await addRow(data)
}
const onOverrideSaved = async () => { formOpen.value = false; await load() }

// 详情预览
const showOpen = ref(false)
const viewingRow = ref<Record<string, any> | null>(null)
const onView = (row: Record<string, any>) => { viewingRow.value = row; showOpen.value = true }

// 导入/导出
const { importOpen, exportOpen, exportRows, exporting, onImport, openExport } = useManagerIo(importRows, fetchExportRows)

// 确认对话框
const {
  confirmOpen, confirmText, confirmColor, confirmLoading,
  confirmBatch, onSingleDelete, onSingleRestore, onSingleRemove, executeConfirm,
} = useConfirmBatch(batchDelete, batchRemove, batchRestore)
</script>
