<template>
  <div class="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
    <UButton
      icon="i-lucide-pencil"
      variant="ghost"
      size="xs"
      color="primary"
      :title="t('admin.menu.editItem')"
      @click.stop="$emit('openEdit', index)"
    />
    <UButton
      v-if="item.depth < maxDepth"
      icon="i-lucide-plus"
      variant="ghost"
      size="xs"
      color="primary"
      :title="t('admin.menu.addChild')"
      @click.stop="$emit('addChild', index)"
    />
    <UButton
      icon="i-lucide-list-plus"
      variant="ghost"
      size="xs"
      color="primary"
      :title="t('admin.menu.addSibling')"
      @click.stop="$emit('addSibling', index)"
    />
    <UButton
      icon="i-lucide-trash-2"
      variant="ghost"
      size="xs"
      color="error"
      :title="t('admin.menu.delete')"
      @click.stop="$emit('delete', index)"
    />
  </div>
</template>

<script setup lang="ts">
import type { FlatMenuItem } from './EditorItem.vue'

const props = defineProps<{
  item: FlatMenuItem
  index: number
  maxDepth: number
}>()

defineEmits<{
  openEdit: [index: number]
  addChild: [index: number]
  addSibling: [index: number]
  delete: [index: number]
}>()

const { t } = useI18n()
</script>
