<template>
  <div class="flex items-center gap-2 mb-4">
    <UIcon name="i-lucide-user-search" class="size-4 text-muted shrink-0" />
    <span class="text-sm font-medium whitespace-nowrap">{{ $t('coursePanel.viewAs') }}</span>
    <USelect
      v-model="selectedUserId"
      :items="userOptions"
      :loading="loading"
      size="sm"
      class="flex-1"
      :placeholder="$t('coursePanel.selectStudent')"
      @update:model-value="onSelect"
    />
    <UBadge v-if="impersonating" color="warning" variant="subtle" size="sm" :label="$t('coursePanel.impersonating')" />
    <UButton
      v-if="impersonating"
      icon="i-lucide-rotate-ccw"
      size="sm"
      variant="outline"
      color="warning"
      :loading="restoring"
      :label="$t('coursePanel.restoreRole')"
      @click="restore"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  courseId: number
}>()

const emit = defineEmits<{
  impersonated: [userId: number]
  restored: []
}>()

const {
  loading,
  restoring,
  selectedUserId,
  impersonating,
  userOptions,
  onSelect,
  restore,
} = useCourseUserSelect(props, emit)
</script>
