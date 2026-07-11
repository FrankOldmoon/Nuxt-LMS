<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-md' }">
    <template #content>
      <div v-if="item" class="p-4 space-y-3 min-w-[420px]">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold">{{ t('admin.menu.editItem') }}</h3>
          <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="close" />
        </div>

        <UFormField :label="t('admin.menu.label')" required>
          <UInput v-model="labelDraft" size="sm" class="w-full" :placeholder="t('admin.menu.label')" />
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
            :model-value="tableDraft || GROUP_VALUE"
            :items="tableItems"
            value-key="value"
            option-attribute="label"
            :placeholder="t('admin.menu.selectTable')"
            size="sm"
            class="w-full"
            @update:model-value="(v: any) => (tableDraft = !v || v === GROUP_VALUE ? undefined : v)"
          />
        </UFormField>

        <UFormField :label="t('admin.menu.visible')">
          <USwitch v-model="visibleDraft" />
        </UFormField>

        <div class="flex justify-end gap-2 pt-2">
          <UButton color="neutral" variant="ghost" :label="t('admin.menu.cancel')" @click="close" />
          <UButton color="primary" :label="t('admin.menu.saveAndClose')" @click="confirm" />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { TableMetaSummary } from '../../utils/types'
import type { FlatMenuItem } from './EditorItem.vue'

const props = defineProps<{
  open: boolean
  item: FlatMenuItem | null
  tables: TableMetaSummary[]
}>()
const emit = defineEmits<{
  'update:open': [v: boolean]
  confirm: [item: Partial<FlatMenuItem>]
}>()

const { t } = useI18n()

/** 关闭弹窗（使用具名函数避免内联赋值返回 boolean 触发类型错误） */
function close() {
  emit('update:open', false)
}

/** 分组占位项（value 不能为空字符串，否则 USelectMenu 内部 ComboboxItem 校验报错） */
const GROUP_VALUE = '__group__'
const tableItems = computed(() => [
  { label: t('admin.menu.group'), value: GROUP_VALUE },
  ...props.tables.map((tb) => ({ label: tb.name, value: tb.name })),
])

const { labelDraft, iconDraft, toDraft, tableDraft, visibleDraft, buildPatch } =
  useEditorItemDrafts(() => props.open, () => props.item)

function confirm() {
  emit('confirm', buildPatch())
  emit('update:open', false)
}
</script>
