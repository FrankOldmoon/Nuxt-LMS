<template>
  <div class="flex items-center justify-between p-4 pt-3 border-t">
    <span class="text-xs text-gray-400">
      {{ t('myFiles.total', { n: total }) }}
      <template v-if="picker && multiple && selectedCount">
        &nbsp;|&nbsp; {{ t('myFiles.selected', { n: selectedCount }) }}
      </template>
    </span>
    <div class="flex items-center gap-2">
      <UButton v-if="picker && multiple && selectedCount" color="primary" size="sm"
        :label="t('myFiles.confirmSelect')" @click="$emit('confirmPickMultiple')" />
      <UPagination v-model:page="pageModel" :total="total" :items-per-page="pageSize" :sibling-count="1"
        @update:page="$emit('pageChange')" />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  picker?: boolean
  multiple?: boolean
  total: number
  pageSize: number
  page: number
  selectedCount: number
}>()

const emit = defineEmits<{
  'update:page': [v: number]
  pageChange: []
  confirmPickMultiple: []
}>()

const { t } = useI18n()

const pageModel = computed({
  get: () => props.page,
  set: (v) => emit('update:page', v),
})
</script>
