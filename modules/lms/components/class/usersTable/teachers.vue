<template>
  <div v-if="!hideTeachers() && teachers.length" class="mb-3">
    <div class="text-xs font-medium text-muted mb-1.5">{{ $t('classSelector.teachers') }}</div>
    <div class="space-y-1">
      <div
        v-for="t in teachers"
        :key="t.id"
        class="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted"
      >
        <UAvatar :src="t.avatarImg || undefined" :alt="t.name" size="2xs" :text="t.name?.charAt(0)" />
        <span class="text-sm flex-1">{{ t.name }}</span>
        <UButton
          icon="i-lucide-pencil"
          size="xs"
          color="neutral"
          variant="ghost"
          :aria-label="$t('common.edit')"
          @click="openEdit(t.id)"
        />
      </div>
    </div>
    <USeparator v-if="students.length" class="mt-3" />
  </div>
</template>

<script setup lang="ts">
const { teachers, students, hideTeachers, openEdit } = useClassUsersTableContext()
</script>
