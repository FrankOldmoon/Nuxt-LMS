<template>
  <!-- ClassSelectlines -->
  <div class="flex items-center gap-2">
    <UInputMenu v-if="classOptions.length && !editingClassName" v-model="selectedItem" :items="classOptions"
      value-key="value" label-key="label" :placeholder="$t('classSelector.searchPlaceholder')"
      :loading="classLoading" icon="i-lucide-search" class="flex-1" @change="on ClassChange" />

    <!-- EditClass Name -->
    <UInput v-if="selectedClassId && editingClassName" v-model="editClassName" size="sm" class="flex-1"
      @keyup.enter="saveClassName" />
    <UButton v-if="selectedClassId && editingClassName" icon="i-lucide-check" size="sm" color="primary"
      variant="soft" :loading="savingClassName" @click="saveClassName" />
    <UButton v-if="selectedClassId && editingClassName" icon="i-lucide-x" size="sm" color="neutral"
      variant="ghost" @click="cancelEditClassName" />

    <UButton v-if="selectedClassId && !editingClassName" icon="i-lucide-pencil" size="xs" color="neutral"
      variant="ghost" :aria-label="$t('classSelector.editClassName')" @click="startEditClassName" />
  </div>

  <!-- AddClass -->
  <div v-if="hasRole('admin')" class="flex items-center gap-2 mt-3">
    <UInput v-model="newClassName" :placeholder="$t('classSelector.newClassNamePlaceholder')" class="flex-1"
      size="sm" @keyup.enter="addClass" />
    <UButton :label="$t('classSelector.addClass')" icon="i-lucide-plus" size="sm" color="primary" variant="soft"
      :loading="adding" @click="addClass" />
  </div>

  <!-- ClassUserTable -->
  <div v-if="selectedClassId" class="mt-4">
    <ClassUsersTable ref="classUsersTableRef" :class-id="selectedClassId" show-online />
  </div>

  <!-- AddStudent/Teacherto Class -->
  <div v-if="selectedClassId" class="mt-4 space-y-3">
    <div class="text-sm font-medium text-muted">{{ $t('classSelector.addMembers') }}</div>

    <!-- Student -->
    <ClassModalMemberPicker
      v-model:search="studentSearch"
      :searching="studentSearching"
      :results="studentSearchResults"
      :selected="selectedStudents"
      :adding="addingStudents"
      :placeholder="$t('classSelector.searchStudentPlaceholder')"
      :add-label="$t('classSelector.addStudents')"
      add-icon="i-lucide-user-plus"
      add-color="primary"
      badge-color="info"
      @search-input="onStudentSearchInput"
      @toggle="toggleStudentSelect"
      @remove="removeSelectedStudent"
      @add="addStudentsToClass"
    />

    <!-- Teacher -->
    <ClassModalMemberPicker
      v-model:search="teacherSearch"
      :searching="teacherSearching"
      :results="teacherSearchResults"
      :selected="selectedTeachers"
      :adding="addingTeachers"
      :placeholder="$t('classSelector.searchTeacherPlaceholder')"
      :add-label="$t('classSelector.addTeachers')"
      add-icon="i-lucide-user-plus"
      add-color="warning"
      badge-color="warning"
      @search-input="onTeacherSearchInput"
      @toggle="toggleTeacherSelect"
      @remove="removeSelectedTeacher"
      @add="addTeachersToClass"
    />
  </div>
</template>

<script setup lang="ts">
const {
  hasRole, classOptions, selectedItem, classLoading, on ClassChange,
  editingClassName, editClassName, savingClassName, saveClassName, cancelEditClassName, startEditClassName,
  newClassName, adding, addClass,
  selectedClassId, classUsersTableRef,
  studentSearch, studentSearching, studentSearchResults, selectedStudents, addingStudents,
  toggleStudentSelect, removeSelectedStudent, onStudentSearchInput, addStudentsToClass,
  teacherSearch, teacherSearching, teacherSearchResults, selectedTeachers, addingTeachers,
  toggleTeacherSelect, removeSelectedTeacher, onTeacherSearchInput, addTeachersToClass,
} = useClassModalContext()
</script>
