<template>
  <div v-if="!hideTeachers() && teachers.length" class="mb-3">
    <div class="text-xs font-medium text-muted mb-1.5">{{ $t('classSelector.teachers') }}</div>
    <div class="space-y-1">
      <div
        v-for="t in teachers"
        :key="t.id"
        class="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted"
      >
        <AvatarWithFrame :src="t.avatarImg || undefined" :alt="t.name" size="2xs" :text="t.name?.charAt(0)"
          :frame="t.avatarFrame || null" :userId="t.id" />
        <span class="text-sm flex-1">{{ t.name }}</span>
        <UButton
          icon="i-lucide-trash-2"
          size="xs"
          color="error"
          variant="ghost"
          :aria-label="$t('common.delete')"
          @click="confirmRemoveTeacher(t)"
        />
      </div>
    </div>
    <USeparator v-if="students.length" class="mt-3" />
  </div>

  <!-- 移除教师确认弹窗 -->
  <UModal v-model:open="removeTeacherOpen" :ui="{ content: 'sm:max-w-sm' }">
    <template #content>
      <div class="p-6 space-y-4">
        <h3 class="text-base font-semibold">{{ $t('common.delete') }}</h3>
        <p class="text-sm text-muted">
          {{ $t('classSelector.removeTeacherConfirm', { name: removeTeacherName }) }}
        </p>
        <div class="flex justify-end gap-2">
          <UButton :label="$t('common.cancel')" color="neutral" variant="ghost" @click="removeTeacherOpen = false" />
          <UButton :label="$t('common.delete')" color="error" :loading="removingTeacher" @click="doRemoveTeacher" />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const {
  teachers, students, hideTeachers,
  confirmRemoveTeacher, doRemoveTeacher,
  removeTeacherOpen, removeTeacherName, removingTeacher,
} = useClassUsersTableContext()
</script>
