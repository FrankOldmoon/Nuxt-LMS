<template>
  <div
    class="flex items-center gap-1 p-1 rounded-lg border border-transparent hover:border-default group"
    :style="{ paddingLeft: (item.depth * 20 + 4) + 'px' }"
  >
    <!-- 折叠/展开按钮：仅在有子节点时显示 -->
    <button
      v-if="hasChildren"
      class="shrink-0 w-4 h-4 flex items-center justify-center rounded text-muted hover:text-default transition-colors cursor-pointer"
      :title="collapsed ? t('admin.menu.expand') : t('admin.menu.collapse')"
      @click.stop="$emit('toggleCollapse')"
    >
      <UIcon :name="collapsed ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'" class="size-3" />
    </button>
    <span v-else class="shrink-0 w-4" />

    <!-- 拖拽手柄 -->
    <div class="drag-handle cursor-grab active:cursor-grabbing shrink-0 text-muted hover:text-default">
      <UIcon name="i-lucide-grip-vertical" class="size-3.5" />
    </div>

    <!-- 标签预览（点击=编辑） -->
    <button
      class="flex-1 min-w-0 text-left truncate text-sm hover:text-primary transition-colors"
      :class="item.visible ? '' : 'text-muted line-through'"
      :title="item.label || t('admin.menu.placeholder')"
      @click="$emit('openEdit', index)"
    >
      <UIcon v-if="resolvedIcon" :name="resolvedIcon" class="inline-block size-3.5 align-text-bottom mr-1 text-muted" />
      {{ item.label || t('admin.menu.placeholder') }}
    </button>

    <!-- 可见开关 -->
    <USwitch
      :model-value="item.visible"
      :title="t('admin.menu.visibleHint')"
      @update:model-value="(v: boolean) => $emit('update:visible', v)"
    />

    <!-- 操作按钮组 -->
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
/** 菜单编辑器单行：与 navEditor/item.vue 风格一致 + 标签预览/编辑按钮 */
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

/** 解析图标：自定义 icon > 按 table 给默认 lucide-table > 隐藏 */
const resolvedIcon = computed(() => {
  if (props.item.icon) return props.item.icon
  if (props.item.table) return 'i-lucide-table'
  return ''
})
</script>
