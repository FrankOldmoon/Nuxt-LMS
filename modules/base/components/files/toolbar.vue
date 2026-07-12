<template>
  <div class="flex items-center gap-2 px-4 pb-3">
    <UInput v-model="keyword" :placeholder="t('myFiles.searchPlaceholder')" icon="i-lucide-search" size="sm"
      class="flex-1" @keydown.enter="$emit('search')" />
    <USelect v-model="sortBy" :items="sortOptions" size="sm" class="w-36" @update:model-value="$emit('sortChange')" />
    <UButton :icon="orderIcon" color="neutral" variant="outline" size="sm" @click="$emit('toggleOrder')" />
    <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" size="sm" @click="$emit('refresh')" />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  keyword: string
  sortBy: string
  sortOptions: { label: string; value: string }[]
  orderIcon: string
}>()

const emit = defineEmits<{
  'update:keyword': [v: string]
  'update:sortBy': [v: string]
  search: []
  sortChange: []
  toggleOrder: []
  refresh: []
}>()

const { t } = useI18n()

const keyword = computed({
  get: () => props.keyword,
  set: (v) => emit('update:keyword', v),
})
const sortBy = computed({
  get: () => props.sortBy,
  set: (v) => emit('update:sortBy', v),
})
</script>
