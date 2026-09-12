<template>
  <div class="flex items-center justify-between gap-2 p-2 rounded-lg border border-default">
    <div class="flex items-center gap-2 min-w-0">
      <AvatarWithFrame :src="member.avatarImg || undefined" :alt="member.name" size="xs" :text="member.name?.charAt(0)"
        :frame="member.avatarFrame || null" :userId="member.id" />
      <span class="text-sm truncate">{{ member.name }} <span class="text-muted">({{ member.username }})</span></span>
    </div>
    <UButton
      icon="i-lucide-x"
      size="xs"
      color="neutral"
      variant="ghost"
      :loading="updating"
      :aria-label="role === 'teacher' ? $t('courseEditor.removeTeacher') : $t('courseEditor.removeEditor')"
      @click="$emit('remove', member.userId, role)"
    />
  </div>
</template>

<script setup lang="ts">
import type { LmsMember } from '#lms/types/lms'

defineProps<{
  member: LmsMember
  role: 'teacher' | 'editor'
  updating: boolean
}>()

defineEmits<{ remove: [userId: number, role: 'teacher' | 'editor'] }>()
</script>
