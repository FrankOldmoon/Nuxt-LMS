<template>
  <div class="flex gap-2">
    <div class="flex-1 space-y-1">
      <UInput :model-value="search" :placeholder="placeholder" icon="i-lucide-search" size="sm"
        :loading="searching" @update:model-value="onInput" />
      <div v-if="results.length" class="max-h-[160px] overflow-y-auto border border-default rounded-md">
        <div v-for="user in results" :key="user.id"
          class="flex items-center gap-2 px-3 py-1.5 hover:bg-muted cursor-pointer text-sm"
          :class="{ 'opacity-50': isSelected(user.id) }" @click="emit('toggle', user)">
          <UIcon :name="isSelected(user.id) ? 'i-lucide-check-square' : 'i-lucide-square'"
            class="size-4 text-primary shrink-0" />
          <AvatarWithFrame :src="user.avatarImg || undefined" :alt="user.name" size="2xs"
            :text="user.name?.charAt(0)" :frame="user.avatarFrame || null" :userId="user.id" />
          <span class="truncate">{{ user.name }}</span>
        </div>
      </div>
    </div>
    <UButton :label="addLabel" :icon="addIcon" size="sm" :color="addColor"
      :loading="adding" :disabled="!selected.length" @click="emit('add')" />
  </div>

  <!-- 已选标签 -->
  <div v-if="selected.length" class="flex flex-wrap gap-1.5">
    <UBadge v-for="u in selected" :key="u.id" :label="u.name" :color="badgeColor" variant="subtle" size="xs">
      <template #leading>
        <UIcon name="i-lucide-x" class="size-3 cursor-pointer hover:text-error" @click="emit('remove', u.id)" />
      </template>
    </UBadge>
  </div>
</template>

<script setup lang="ts">
import type { LmsSearchUser } from '#lms/types/lms'

type UIColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

const props = defineProps<{
  search: string
  searching: boolean
  results: LmsSearchUser[]
  selected: LmsSearchUser[]
  adding: boolean
  placeholder: string
  addLabel: string
  addIcon: string
  addColor: UIColor
  badgeColor: UIColor
}>()

const emit = defineEmits<{
  'update:search': [v: string]
  'search-input': []
  toggle: [user: LmsSearchUser]
  remove: [userId: number]
  add: []
}>()

function isSelected(userId: number) {
  return props.selected.some((u) => u.id === userId)
}

function onInput(v: string) {
  emit('update:search', v)
  emit('search-input')
}
</script>
