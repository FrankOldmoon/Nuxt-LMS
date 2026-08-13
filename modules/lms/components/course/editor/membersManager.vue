<template>
  <div>
    <USeparator :label="$t('courseEditor.membersSection')" class="my-4" />

    <!-- 教师列表 -->
    <div>
      <p class="text-sm font-medium mb-2 flex items-center gap-1.5">
        <UIcon name="i-lucide-graduation-cap" class="size-4 text-primary" />
        {{ $t('courseEditor.roleTeacher') }}
      </p>
      <div v-if="teachers.length" class="space-y-2">
        <MemberRow v-for="m in teachers" :key="m.userId" :member="m" role="teacher"
          :updating="memberUpdating === m.userId" @remove="removeMember" />
      </div>
      <p v-else class="text-sm text-muted text-center py-2">{{ $t('courseEditor.noTeachers') }}</p>
    </div>

    <!-- 编辑者列表 -->
    <div>
      <p class="text-sm font-medium mb-2 flex items-center gap-1.5">
        <UIcon name="i-lucide-pencil" class="size-4 text-info" />
        {{ $t('courseEditor.roleEditor') }}
      </p>
      <div v-if="editors.length" class="space-y-2">
        <MemberRow v-for="m in editors" :key="m.userId" :member="m" role="editor"
          :updating="memberUpdating === m.userId" @remove="removeMember" />
      </div>
      <p v-else class="text-sm text-muted text-center py-2">{{ $t('courseEditor.noEditors') }}</p>
    </div>

    <!-- 搜索并添加成员 -->
    <UFormField :label="$t('courseEditor.addMember')" class="w-full">
      <UInput v-model="memberSearchKeyword" :placeholder="$t('courseEditor.searchPlaceholder')" icon="i-lucide-search"
        class="w-full" />
    </UFormField>
    <div v-if="searchResults.length" class="mt-2 space-y-1 min-h-4 max-h-40 overflow-y-auto">
      <MemberSearchRow v-for="u in searchResults" :key="u.id" :user="u" :updating="memberUpdating === u.id"
        :is-teacher="isMemberRole(u.id, 'teacher')" :is-editor="isMemberRole(u.id, 'editor')" @add="addMember" />
    </div>
  </div>
</template>

<script setup lang="ts">
import MemberSearchRow from './memberSearchRow.vue'
import MemberRow from './memberRow.vue'
const props = defineProps<{
  courseId: number
}>()

const {
  memberSearchKeyword, searchResults, memberUpdating,
  teachers, editors, isMemberRole, loadMembers, addMember, removeMember,
} = useCourseMembersManager(props)
defineExpose({ loadMembers })
</script>
