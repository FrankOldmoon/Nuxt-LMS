<template>
  <!-- 主编辑弹窗：菜单树（navEditor 风格） -->
  <UModal v-model:open="open" :ui="{ content: 'max-w-2xl' }">
    <template #content>
      <div class="p-4 min-w-[560px]">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-base font-semibold">{{ t('admin.menu.edit') }}</h3>
          <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="close" />
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
          <UButton color="neutral" variant="ghost" :label="t('admin.menu.cancel')" @click="close" />
          <div class="flex gap-2">
            <UButton color="neutral" variant="outline" :label="t('admin.menu.reset')" @click="resetFromItems" />
            <UButton color="primary" :label="t('admin.menu.saveAndClose')" :loading="pending" @click="onSave" />
          </div>
        </div>
      </div>
    </template>
  </UModal>

  <!-- 二级：单条菜单项编辑弹窗（独立 UModal） -->
  <MenuEditorItemModal
    v-model:open="itemEditOpen"
    :item="editingItem"
    :tables="tables"
    @confirm="onItemConfirm"
  />
</template>

<script setup lang="ts">
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [v: boolean] }>()
const { t } = useI18n()

const open = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v),
})

function close() {
  emit('update:open', false)
}

const {
  tables,
  local,
  genKey,
  pending,
  resetFromItems,
  onSave,
  itemEditOpen,
  editingItem,
  openItemEdit,
  onItemConfirm,
} = useMenuEditor(open, emit)
</script>
