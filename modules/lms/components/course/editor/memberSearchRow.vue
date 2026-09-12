<template>
  <div class="flex items-center justify-between gap-2 p-2 rounded-lg border border-default hover:bg-elevated/50">
    <div class="flex items-center gap-2 min-w-0">
      <AvatarWithFrame :src="user.avatarImg || undefined" :alt="user.name" size="xs" :text="user.name?.charAt(0)"
        :frame="user.avatarFrame || null" :userId="user.id" />
      <span class="text-sm truncate">{{ user.name }} <span class="text-muted">({{ user.username }})</span></span>
    </div>
    <div class="flex items-center gap-1 shrink-0">
      <UButton
        :label="$t('courseEditor.roleTeacher')"
        size="xs"
        color="primary"
        variant="soft"
        :loading="updating"
        :disabled="isTeacher"
        @click="$emit('add', user.id, 'teacher')"
      />
      <UButton
        :label="$t('courseEditor.roleEditor')"
        size="xs"
        color="info"
        variant="soft"
        :loading="updating"
        :disabled="isEditor"
        @click="$emit('add', user.id, 'editor')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LmsSearchUser } from '#lms/types/lms'

defineProps<{
  user: LmsSearchUser
  updating: boolean
  isTeacher: boolean
  isEditor: boolean
}>()

defineEmits<{ add: [userId: number, role: 'teacher' | 'editor'] }>()
</script>
