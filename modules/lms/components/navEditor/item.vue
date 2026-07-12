<template>
  <div
    class="flex items-center gap-1 p-1 rounded-lg border border-transparent hover:border-gray-200 dark:hover:border-gray-700 group"
    :style="{ paddingLeft: (item.depth * 20 + 4) + 'px' }"
  >
    <!-- 折叠/展开 -->
    <button
      v-if="hasChildren"
      class="shrink-0 w-4 h-4 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
      @click.stop="$emit('toggleCollapse')"
    >
      <UIcon :name="collapsed ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'" class="size-3" />
    </button>
    <span v-else class="shrink-0 w-4" />

    <!-- 拖拽手柄 -->
    <div class="drag-handle cursor-grab active:cursor-grabbing shrink-0 text-gray-400 hover:text-gray-600">
      <UIcon name="i-lucide-grip-vertical" class="size-3.5" />
    </div>

    <!-- 标签编辑 -->
    <UInput
      :model-value="item.label"
      size="xs"
      class="flex-1 min-w-0"
      :placeholder="$t('navEditor.placeholder')"
      @update:model-value="(val: string) => item.label = val"
    />

    <!-- 操作按钮 -->
    <div class="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
      <UButton
        v-if="item.depth < maxDepth"
        icon="i-lucide-plus"
        variant="ghost"
        size="xs"
        color="primary"
        :title="$t('navEditor.addChild')"
        @click="$emit('addChild', index)"
      />
      <UButton
        icon="i-lucide-list-plus"
        variant="ghost"
        size="xs"
        color="primary"
        :title="$t('navEditor.addSibling')"
        @click="$emit('addSibling', index)"
      />
      <UButton
        icon="i-lucide-trash-2"
        variant="ghost"
        size="xs"
        color="error"
        :title="$t('navEditor.deleteWithChildren')"
        @click="$emit('delete', index)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FlatNode } from '../../composables/useNavEditor'

defineProps<{
  item: FlatNode
  index: number
  maxDepth: number
  hasChildren?: boolean
  collapsed?: boolean
}>()

defineEmits<{
  addChild: [index: number]
  addSibling: [index: number]
  delete: [index: number]
  toggleCollapse: []
}>()
</script>
