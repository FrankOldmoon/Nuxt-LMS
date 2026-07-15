<template>
  <FilesHeader
    :group="group"
    :title="title"
    :uploading="uploading"
    :usage="usage"
    @upload="uploadFile"
  />

  <FilesToolbar
    v-model:keyword="keyword"
    v-model:sort-by="sortBy"
    :sort-options="sortOptions"
    :order-icon="orderIcon"
    @search="loadFiles(1)"
    @sort-change="loadFiles(1)"
    @toggle-order="toggleOrder"
    @refresh="loadFiles()"
  />

  <!-- File list -->
  <div class="flex-1 min-h-0 overflow-auto px-4">
    <div v-if="loading" class="flex items-center justify-center py-12 text-gray-400">
      <UIcon name="i-lucide-loader-2" class="animate-spin mr-2" />
      {{ t('common.loading') }}
    </div>

    <div v-else-if="!files.length" class="flex flex-col items-center justify-center py-12 text-gray-400">
      <UIcon name="i-lucide-folder-open" class="size-10 mb-2" />
      {{ t('myFiles.empty') }}
    </div>

    <table v-else class="w-full text-sm">
      <thead class="sticky top-0 bg-default">
        <tr class="text-left text-gray-500 border-b">
          <th class="py-2 pr-2 font-medium">{{ t('myFiles.colName') }}</th>
          <th class="py-2 px-2 font-medium w-28">{{ t('myFiles.colSize') }}</th>
          <th class="py-2 px-2 font-medium w-44">{{ t('myFiles.colTime') }}</th>
          <th class="py-2 pl-2 font-medium w-32 text-right">{{ t('myFiles.colActions') }}</th>
        </tr>
      </thead>
      <tbody>
        <FilesFileRow
          v-for="f in files"
          :key="f.id"
          :f="f"
          :picker="picker"
          :multiple="multiple"
          :renaming-id="renamingId"
          :selected-ids="selectedIds"
          :start-rename="startRename"
          :cancel-rename="cancelRename"
          :confirm-rename="confirmRename"
          :preview="preview"
          :download="download"
          :remove="remove"
          :pick-file="pickFile"
          :toggle-select="toggleSelect"
          v-model:rename-value="renameValue"
        />
      </tbody>
    </table>
  </div>

  <FilesFooter
    :picker="picker"
    :multiple="multiple"
    :total="total"
    :page-size="pageSize"
    :page="page"
    :selected-count="selectedIds.size"
    @update:page="(v) => { page = v }"
    @page-change="loadFiles()"
    @confirm-pick-multiple="confirmPickMultiple"
  />
</template>

<script setup lang="ts">
const props = defineProps<{
  group?: string
  picker?: boolean
  multiple?: boolean
  open?: boolean
}>()

const emit = defineEmits<{
  confirm: [files: any[]]
}>()

const openRef = computed(() => props.open)
const {
  t, title, files, loading, total, page, pageSize, keyword, sortBy, sortOptions, orderIcon,
  selectedIds, usage, renamingId, renameValue, uploading,
  toggleOrder, loadFiles, uploadFile,
  startRename, cancelRename, confirmRename, remove, download, preview,
  pickFile, toggleSelect, confirmPickMultiple,
} = useMyFiles(() => props.group, openRef, (files) => emit('confirm', files))
</script>
