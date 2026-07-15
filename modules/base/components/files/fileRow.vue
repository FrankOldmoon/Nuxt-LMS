<template>
  <tr class="border-b hover:bg-elevated/50 group">
    <td class="py-2 pr-2">
      <div class="flex items-center gap-2">
        <UIcon :name="fileIcon(f)" class="shrink-0 text-gray-400" />
        <div class="min-w-0 flex-1">
          <span v-if="renamingId !== f.id" class="truncate block">{{ f.name }}</span>
          <UInput v-else v-model="renameValue" size="xs" autofocus class="flex-1"
            @keydown.enter="confirmRename(f)" @keydown.esc="cancelRename" />
          <div v-if="renamingId !== f.id && f.path" class="text-xs text-gray-400 truncate"
            :title="f.path">{{ f.path }}</div>
        </div>
      </div>
    </td>
    <td class="py-2 px-2 text-gray-500">{{ formatBytes(f.size) }}</td>
    <td class="py-2 px-2 text-gray-500">{{ formatFileDate(f.createdAt) }}</td>
    <td class="py-2 pl-2">
      <div class="flex items-center justify-end gap-1">
        <!-- Selector mode -->
        <template v-if="picker">
          <UButton v-if="!multiple" icon="i-lucide-check" color="primary" variant="soft" size="xs"
            :label="t('common.select')" @click="pickFile(f)" />
          <UCheckbox v-else :model-value="selectedIds.has(f.id)"
            @update:model-value="(v: any) => toggleSelect(f, !!v)" />
        </template>
        <!-- Management mode -->
        <template v-else>
          <UTooltip v-if="renamingId !== f.id" :text="t('common.edit')">
            <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" size="xs"
              @click="startRename(f)" />
          </UTooltip>
          <template v-else>
            <UButton icon="i-lucide-check" color="success" variant="ghost" size="xs"
              @click="confirmRename(f)" />
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs"
              @click="cancelRename" />
          </template>
          <!-- Image type: show preview on hover -->
          <UPopover v-if="isImageFile(f)" mode="hover" :content="{ align: 'center', side: 'left' }">
            <UButton icon="i-lucide-eye" color="neutral" variant="ghost" size="xs"
              @click="preview(f)" />
            <template #content>
              <img :src="fileUrl(f)" :alt="f.name"
                class="max-w-xs max-h-80 object-contain rounded" loading="lazy" />
            </template>
          </UPopover>
          <!-- Other types: click to preview -->
          <UTooltip v-else :text="t('myFiles.preview')">
            <UButton icon="i-lucide-eye" color="neutral" variant="ghost" size="xs"
              @click="preview(f)" />
          </UTooltip>
          <UTooltip :text="t('myFiles.download')">
            <UButton icon="i-lucide-download" color="neutral" variant="ghost" size="xs"
              @click="download(f)" />
          </UTooltip>
          <UTooltip :text="t('common.delete')">
            <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs"
              @click="remove(f)" />
          </UTooltip>
        </template>
      </div>
    </td>
  </tr>
</template>

<script setup lang="ts">
import { formatBytes, formatFileDate, fileIcon, isImageFile, fileUrl } from '../../utils/fileUtils'

defineProps<{
  f: any
  picker?: boolean
  multiple?: boolean
  renamingId: number | null
  selectedIds: Set<number>
  startRename: (f: any) => void
  cancelRename: () => void
  confirmRename: (f: any) => void
  preview: (f: any) => void
  download: (f: any) => void
  remove: (f: any) => void
  pickFile: (f: any) => void
  toggleSelect: (f: any, checked: boolean) => void
}>()

const { t } = useI18n()

/** Local renameValue proxy (v-model two-way sync to parent component) */
const renameValue = defineModel<string>('renameValue', { default: '' })
</script>
