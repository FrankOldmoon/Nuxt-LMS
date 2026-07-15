<template>
  <div
    class="flex items-center gap-1 p-1 rounded-lg border border-transparent hover:border-default group"
    :style="{ paddingLeft: (item.depth * 20 + 4) + 'px' }"
  >
    <!-- Collapse/expand button: only shown when there are child nodes -->
    <button
      v-if="hasChildren"
      class="shrink-0 w-4 h-4 flex items-center justify-center rounded text-muted hover:text-default transition-colors cursor-pointer"
      :title="collapsed ? t('admin.menu.expand') : t('admin.menu.collapse')"
      @click.stop="$emit('toggleCollapse')"
    >
      <UIcon :name="collapsed ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'" class="size-3" />
    </button>
    <span v-else class="shrink-0 w-4" />

    <!-- Drag handle -->
    <div class="drag-handle cursor-grab active:cursor-grabbing shrink-0 text-muted hover:text-default">
      <UIcon name="i-lucide-grip-vertical" class="size-3.5" />
    </div>

    <!-- Label preview (click = edit) -->
    <button
      class="flex-1 min-w-0 text-left truncate text-sm hover:text-primary transition-colors"
      :class="item.visible ? '' : 'text-muted line-through'"
      :title="item.label || t('admin.menu.placeholder')"
      @click="$emit('openEdit', index)"
    >
      <UIcon v-if="resolvedIcon" :name="resolvedIcon" class="inline-block size-3.5 align-text-bottom mr-1 text-muted" />
      {{ item.label || t('admin.menu.placeholder') }}
    </button>

    <!-- Visibility toggle -->
    <USwitch
      :model-value="item.visible"
      :title="t('admin.menu.visibleHint')"
      @update:model-value="(v: boolean) => $emit('update:visible', v)"
    />

    <!-- Action button group -->
    <MenuEditorItemActions
      :item="item"
      :index="index"
      :max-depth="maxDepth"
      @open-edit="$emit('openEdit', $event)"
      @add-child="$emit('addChild', $event)"
      @add-sibling="$emit('addSibling', $event)"
      @delete="$emit('delete', $event)"
    />
  </div>
</template>

<script setup lang="ts">
/** Menu editor single row: consistent with navEditor/item.vue style + label preview/edit button */
export interface FlatMenuItem {
  _key: number
  table?: string
  label: string
  visible: boolean
  icon?: string
  to?: string
  depth: number
}

const props = defineProps<{
  item: FlatMenuItem
  index: number
  maxDepth: number
  hasChildren?: boolean
  collapsed?: boolean
}>()

defineEmits<{
  openEdit: [index: number]
  addChild: [index: number]
  addSibling: [index: number]
  delete: [index: number]
  toggleCollapse: []
  'update:visible': [v: boolean]
}>()

const { t } = useI18n()

/** Resolve icon: custom icon > default lucide-table by table > hidden */
const resolvedIcon = computed(() => {
  if (props.item.icon) return props.item.icon
  if (props.item.table) return 'i-lucide-table'
  return ''
})
</script>
