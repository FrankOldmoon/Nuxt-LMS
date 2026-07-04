<template>
  <UModal v-model:open="open" scrollable :ui="{ content: 'w-[80vw] max-w-[80vw]' }">
    <template #content>
      <div class="p-6 w-full">
        <h3 class="text-lg font-semibold mb-4">{{ $t('classSelector.selectClass') }}</h3>

        <!-- 班级选择行 -->
        <div class="flex items-center gap-2">
          <UInputMenu v-model="selectedItem" :items="classOptions" value-key="value" label-key="label"
            :placeholder="$t('classSelector.searchPlaceholder')" :loading="classLoading" icon="i-lucide-search"
            class="flex-1" @change="onClassChange" v-if="classOptions.length && !editingClassName" />

          <!-- 编辑班级名称 -->
          <UInput v-if="selectedClassId && editingClassName" v-model="editClassName" size="sm" class="flex-1"
            @keyup.enter="saveClassName" />
          <UButton v-if="selectedClassId && editingClassName" icon="i-lucide-check" size="sm" color="primary"
            variant="soft" :loading="savingClassName" @click="saveClassName" />
          <UButton v-if="selectedClassId && editingClassName" icon="i-lucide-x" size="sm" color="neutral"
            variant="ghost" @click="cancelEditClassName" />

          <UButton v-if="selectedClassId && !editingClassName" icon="i-lucide-pencil" size="xs" color="neutral"
            variant="ghost" :aria-label="$t('classSelector.editClassName')" @click="startEditClassName" />
        </div>

        <!-- 新增班级 -->
        <div class="flex items-center gap-2 mt-3">
          <UInput v-model="newClassName" :placeholder="$t('classSelector.newClassNamePlaceholder')" class="flex-1"
            size="sm" @keyup.enter="addClass" />
          <UButton :label="$t('classSelector.addClass')" icon="i-lucide-plus" size="sm" color="primary" variant="soft"
            :loading="adding" @click="addClass" />
        </div>

        <!-- 班级用户表格 -->
        <div v-if="selectedClassId" class="mt-4">
          <ClassUsersTable ref="classUsersTableRef" :class-id="selectedClassId" />
        </div>

        <!-- 添加学生/教师到班级 -->
        <div v-if="selectedClassId" class="mt-4 space-y-3">
          <div class="text-sm font-medium text-muted">{{ $t('classSelector.addMembers') }}</div>


          <!-- 学生行 -->
          <div class="flex gap-2">
            <div class="flex-1 space-y-1">
              <UInput v-model="studentSearch" :placeholder="$t('classSelector.searchStudentPlaceholder')"
                icon="i-lucide-search" size="sm" :loading="studentSearching" @input="onStudentSearchInput" />
              <div v-if="studentSearchResults.length"
                class="max-h-[160px] overflow-y-auto border border-default rounded-md">
                <div v-for="user in studentSearchResults" :key="user.id"
                  class="flex items-center gap-2 px-3 py-1.5 hover:bg-muted cursor-pointer text-sm"
                  :class="{ 'opacity-50': isSelectedStudent(user.id) }" @click="toggleStudentSelect(user)">
                  <UIcon :name="isSelectedStudent(user.id) ? 'i-lucide-check-square' : 'i-lucide-square'"
                    class="size-4 text-primary shrink-0" />
                  <UAvatar :src="user.avatarImg || undefined" :alt="user.name" size="2xs"
                    :text="user.name?.charAt(0)" />
                  <span class="truncate">{{ user.name }}</span>
                </div>
              </div>
            </div>
            <UButton :label="$t('classSelector.addStudents')" icon="i-lucide-user-plus" size="sm" color="primary"
              :loading="addingStudents" :disabled="!selectedStudents.length" @click="addStudentsToClass" />
          </div>

          <!-- 已选学生标签 -->
          <div v-if="selectedStudents.length" class="flex flex-wrap gap-1.5">
            <UBadge v-for="u in selectedStudents" :key="u.id" :label="u.name" color="info" variant="subtle" size="xs">
              <template #leading>
                <UIcon name="i-lucide-x" class="size-3 cursor-pointer hover:text-error"
                  @click="removeSelectedStudent(u.id)" />
              </template>
            </UBadge>
          </div>

          <!-- 教师行 -->
          <div class="flex gap-2">
            <div class="flex-1 space-y-1">
              <UInput v-model="teacherSearch" :placeholder="$t('classSelector.searchTeacherPlaceholder')"
                icon="i-lucide-search" size="sm" :loading="teacherSearching" @input="onTeacherSearchInput" />
              <div v-if="teacherSearchResults.length"
                class="max-h-[160px] overflow-y-auto border border-default rounded-md">
                <div v-for="user in teacherSearchResults" :key="user.id"
                  class="flex items-center gap-2 px-3 py-1.5 hover:bg-muted cursor-pointer text-sm"
                  :class="{ 'opacity-50': isSelectedTeacher(user.id) }" @click="toggleTeacherSelect(user)">
                  <UIcon :name="isSelectedTeacher(user.id) ? 'i-lucide-check-square' : 'i-lucide-square'"
                    class="size-4 text-primary shrink-0" />
                  <UAvatar :src="user.avatarImg || undefined" :alt="user.name" size="2xs"
                    :text="user.name?.charAt(0)" />
                  <span class="truncate">{{ user.name }}</span>
                </div>
              </div>
            </div>
            <UButton :label="$t('classSelector.addTeachers')" icon="i-lucide-user-plus" size="sm" color="warning"
              :loading="addingTeachers" :disabled="!selectedTeachers.length" @click="addTeachersToClass" />
          </div>
        </div>



        <!-- 已选教师标签 -->
        <div v-if="selectedTeachers.length" class="flex flex-wrap gap-1.5">
          <UBadge v-for="u in selectedTeachers" :key="u.id" :label="u.name" color="warning" variant="subtle" size="xs">
            <template #leading>
              <UIcon name="i-lucide-x" class="size-3 cursor-pointer hover:text-error"
                @click="removeSelectedTeacher(u.id)" />
            </template>
          </UBadge>
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-4 mt-4 border-t border-default">
        <UButton :label="$t('common.cancel')" color="neutral" variant="ghost" size="sm"
          @click="() => { open = false }" />
      </div>

    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { LmsClass, LmsSearchUser } from '#shared/types/lms'

const open = defineModel<boolean>('open', { required: true })

const { user, refreshUser } = useAuth()
const toast = useToast()
const { t } = useI18n()
const { editableCourseId } = useLayoutState()
const { fetchUsers } = useClassUsers()

// ==================== 班级选择 ====================

const { classes: classList, loadClasses: loadClassList } = useClasses()
const classLoading = ref(false)
const selectedItem = ref<number | undefined>(undefined)
const newClassName = ref('')
const adding = ref(false)

const selectedClassId = computed(() => user.value?.defaultClass?.id ?? null)

const classOptions = computed(() =>
  classList.value.map((c) => ({ label: c.name, value: c.id })),
)

const classUsersTableRef = ref<{ refresh: () => void } | null>(null)

async function loadClasses() {
  classLoading.value = true
  try {
    await loadClassList()
  } finally {
    classLoading.value = false
  }
}

async function onClassChange() {
  const classId = selectedItem.value
  if (!classId) return
  const c = classList.value.find((c) => c.id === classId)
  if (!c) return
  try {
    await cRequest('/api/auth/me', {
      method: 'PUT',
      body: { defaultClass: { id: c.id, name: c.name } },
    })
    await refreshUser()
    // 切换班级时重新拉取用户
    await fetchUsers(c.id, editableCourseId.value)
    toast.add({ title: t('classSelector.updateSuccess'), color: 'success' })
  } catch (e: any) {
    toast.add({ title: e.message || t('classSelector.updateFailed'), color: 'error' })
  }
}

async function addClass() {
  const name = newClassName.value.trim()
  if (!name) return
  adding.value = true
  try {
    const result = await cRequest<LmsClass[]>('/api/lms/classes/add', {
      method: 'POST',
      body: { name, code: name },
    })
    newClassName.value = ''
    await loadClasses()
    const newClass = result?.[0]
    if (newClass) {
      await cRequest('/api/auth/me', {
        method: 'PUT',
        body: { defaultClass: { id: newClass.id, name: newClass.name } },
      })
      await refreshUser()
      selectedItem.value = newClass.id
    }
    toast.add({ title: t('classSelector.addClassSuccess'), color: 'success' })
  } catch (e: any) {
    toast.add({ title: e.message || t('classSelector.addClassFailed'), color: 'error' })
  } finally {
    adding.value = false
  }
}

// ==================== 编辑班级名称 ====================

const editingClassName = ref(false)
const editClassName = ref('')
const savingClassName = ref(false)

function startEditClassName() {
  const c = classList.value.find((c) => c.id === selectedClassId.value)
  editClassName.value = c?.name || ''
  editingClassName.value = true
}

function cancelEditClassName() {
  editingClassName.value = false
  editClassName.value = ''
}

async function saveClassName() {
  const name = editClassName.value.trim()
  if (!name || !selectedClassId.value) return
  savingClassName.value = true
  try {
    await cRequest('/api/lms/classes/update', {
      method: 'POST',
      body: { id: selectedClassId.value, name },
    })
    // 更新 defaultClass
    await cRequest('/api/auth/me', {
      method: 'PUT',
      body: { defaultClass: { id: selectedClassId.value, name } },
    })
    await refreshUser()
    await loadClasses()
    editingClassName.value = false
    editClassName.value = ''
    toast.add({ title: t('classSelector.editClassNameSuccess'), color: 'success' })
  } catch (e: any) {
    toast.add({ title: e.message || t('classSelector.editClassNameFailed'), color: 'error' })
  } finally {
    savingClassName.value = false
  }
}

// ==================== 学生搜索与添加 ====================

const studentSearch = ref('')
const studentSearching = ref(false)
const studentSearchResults = ref<LmsSearchUser[]>([])
const selectedStudents = ref<LmsSearchUser[]>([])
const addingStudents = ref(false)
let _studentTimer: ReturnType<typeof setTimeout> | null = null

function isSelectedStudent(userId: number) {
  return selectedStudents.value.some((u) => u.id === userId)
}
function toggleStudentSelect(user: LmsSearchUser) {
  if (isSelectedStudent(user.id)) {
    removeSelectedStudent(user.id)
  } else {
    selectedStudents.value.push(user)
  }
}
function removeSelectedStudent(userId: number) {
  selectedStudents.value = selectedStudents.value.filter((u) => u.id !== userId)
}
function onStudentSearchInput() {
  if (_studentTimer) clearTimeout(_studentTimer)
  const keyword = studentSearch.value.trim()
  if (!keyword) { studentSearchResults.value = []; return }
  studentSearching.value = true
  _studentTimer = setTimeout(async () => {
    try {
      const data = await cRequest<LmsSearchUser[]>(`/api/lms/users/search?keyword=${encodeURIComponent(keyword)}`)
      studentSearchResults.value = data || []
    } catch { studentSearchResults.value = [] }
    finally { studentSearching.value = false }
  }, 300)
}
async function addStudentsToClass() {
  if (!selectedClassId.value || !selectedStudents.value.length) return
  addingStudents.value = true
  try {
    await cRequest('/api/lms/classes/users', {
      method: 'POST',
      body: { classId: selectedClassId.value, userIds: selectedStudents.value.map((u) => u.id) },
    })
    toast.add({ title: t('classSelector.addStudentsSuccess'), color: 'success' })
    selectedStudents.value = []; studentSearch.value = ''; studentSearchResults.value = []
    if (selectedClassId.value) await fetchUsers(selectedClassId.value, editableCourseId.value)
  } catch (e: any) {
    toast.add({ title: e.message || t('classSelector.addStudentsFailed'), color: 'error' })
  } finally { addingStudents.value = false }
}

// ==================== 教师搜索与添加 ====================

const teacherSearch = ref('')
const teacherSearching = ref(false)
const teacherSearchResults = ref<LmsSearchUser[]>([])
const selectedTeachers = ref<LmsSearchUser[]>([])
const addingTeachers = ref(false)
let _teacherTimer: ReturnType<typeof setTimeout> | null = null

function isSelectedTeacher(userId: number) {
  return selectedTeachers.value.some((u) => u.id === userId)
}
function toggleTeacherSelect(user: LmsSearchUser) {
  if (isSelectedTeacher(user.id)) {
    removeSelectedTeacher(user.id)
  } else {
    selectedTeachers.value.push(user)
  }
}
function removeSelectedTeacher(userId: number) {
  selectedTeachers.value = selectedTeachers.value.filter((u) => u.id !== userId)
}
function onTeacherSearchInput() {
  if (_teacherTimer) clearTimeout(_teacherTimer)
  const keyword = teacherSearch.value.trim()
  if (!keyword) { teacherSearchResults.value = []; return }
  teacherSearching.value = true
  _teacherTimer = setTimeout(async () => {
    try {
      const data = await cRequest<LmsSearchUser[]>(`/api/lms/users/search?keyword=${encodeURIComponent(keyword)}`)
      teacherSearchResults.value = data || []
    } catch { teacherSearchResults.value = [] }
    finally { teacherSearching.value = false }
  }, 300)
}
async function addTeachersToClass() {
  if (!selectedClassId.value || !selectedTeachers.value.length) return
  addingTeachers.value = true
  try {
    await cRequest('/api/lms/classes/users', {
      method: 'POST',
      body: { classId: selectedClassId.value, userIds: selectedTeachers.value.map((u) => u.id), isTeacher: true },
    })
    toast.add({ title: t('classSelector.addTeachersSuccess'), color: 'success' })
    selectedTeachers.value = []; teacherSearch.value = ''; teacherSearchResults.value = []
    if (selectedClassId.value) await fetchUsers(selectedClassId.value, editableCourseId.value)
  } catch (e: any) {
    toast.add({ title: e.message || t('classSelector.addTeachersFailed'), color: 'error' })
  } finally { addingTeachers.value = false }
}

// ==================== 初始化 ====================

watch(open, async (val) => {
  if (val) {
    selectedItem.value = selectedClassId.value ?? undefined
    newClassName.value = ''
    editingClassName.value = false
    editClassName.value = ''
    studentSearch.value = ''
    studentSearchResults.value = []
    selectedStudents.value = []
    teacherSearch.value = ''
    teacherSearchResults.value = []
    selectedTeachers.value = []
    await loadClasses()
    // 加载完班级列表后，拉取当前班级用户
    if (selectedClassId.value) await fetchUsers(selectedClassId.value, editableCourseId.value)
  }
})

onMounted(async () => {
  if (selectedClassId.value) await fetchUsers(selectedClassId.value, editableCourseId.value)
})
</script>
