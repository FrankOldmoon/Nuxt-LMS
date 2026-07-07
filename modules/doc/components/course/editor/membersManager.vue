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
        <div
          v-for="m in teachers"
          :key="m.userId"
          class="flex items-center justify-between gap-2 p-2 rounded-lg border border-default"
        >
          <div class="flex items-center gap-2 min-w-0">
            <UAvatar :src="m.avatarImg || undefined" :alt="m.name" size="xs" :text="m.name?.charAt(0)" />
            <span class="text-sm truncate">{{ m.name }} <span class="text-muted">({{ m.username }})</span></span>
          </div>
          <UButton
            icon="i-lucide-x"
            size="xs"
            color="neutral"
            variant="ghost"
            :loading="memberUpdating === m.userId"
            :aria-label="$t('courseEditor.removeTeacher')"
            @click="removeMember(m.userId, 'teacher')"
          />
        </div>
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
        <div
          v-for="m in editors"
          :key="m.userId"
          class="flex items-center justify-between gap-2 p-2 rounded-lg border border-default"
        >
          <div class="flex items-center gap-2 min-w-0">
            <UAvatar :src="m.avatarImg || undefined" :alt="m.name" size="xs" :text="m.name?.charAt(0)" />
            <span class="text-sm truncate">{{ m.name }} <span class="text-muted">({{ m.username }})</span></span>
          </div>
          <UButton
            icon="i-lucide-x"
            size="xs"
            color="neutral"
            variant="ghost"
            :loading="memberUpdating === m.userId"
            :aria-label="$t('courseEditor.removeEditor')"
            @click="removeMember(m.userId, 'editor')"
          />
        </div>
      </div>
      <p v-else class="text-sm text-muted text-center py-2">{{ $t('courseEditor.noEditors') }}</p>
    </div>

    <!-- 搜索并添加成员 -->
    <UFormField :label="$t('courseEditor.addMember')" class="w-full">
      <UInput
        v-model="memberSearchKeyword"
        :placeholder="$t('courseEditor.searchPlaceholder')"
        icon="i-lucide-search"
        class="w-full"
      />
      <div v-if="searchResults.length" class="mt-2 space-y-1 max-h-40 overflow-y-auto">
        <div
          v-for="u in searchResults"
          :key="u.id"
          class="flex items-center justify-between gap-2 p-2 rounded-lg border border-default hover:bg-elevated/50"
        >
          <div class="flex items-center gap-2 min-w-0">
            <UAvatar :src="u.avatarImg || undefined" :alt="u.name" size="xs" :text="u.name?.charAt(0)" />
            <span class="text-sm truncate">{{ u.name }} <span class="text-muted">({{ u.username }})</span></span>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <UButton
              :label="$t('courseEditor.roleTeacher')"
              size="xs"
              color="primary"
              variant="soft"
              :loading="memberUpdating === u.id"
              :disabled="isMemberRole(u.id, 'teacher')"
              @click="addMember(u.id, 'teacher')"
            />
            <UButton
              :label="$t('courseEditor.roleEditor')"
              size="xs"
              color="info"
              variant="soft"
              :loading="memberUpdating === u.id"
              :disabled="isMemberRole(u.id, 'editor')"
              @click="addMember(u.id, 'editor')"
            />
          </div>
        </div>
      </div>
    </UFormField>
  </div>
</template>

<script setup lang="ts">
import type { LmsMember, LmsSearchUser } from '#shared/types/lms'

const props = defineProps<{
  courseId: number
}>()

const { t } = useI18n()
const toast = useToast()

const members = ref<LmsMember[]>([])
const memberSearchKeyword = ref('')
const searchResults = ref<LmsSearchUser[]>([])
const memberUpdating = ref<number | null>(null)

const teachers = computed(() => members.value.filter((m) => m.isTeacher))
const editors = computed(() => members.value.filter((m) => m.isEditor))

function isMemberRole(userId: number, role: 'teacher' | 'editor'): boolean {
  const m = members.value.find((m) => m.userId === userId)
  if (!m) return false
  return role === 'teacher' ? m.isTeacher : m.isEditor
}

async function loadMembers() {
  try {
    const data = await cRequest<LmsMember[]>(`/api/courses/members?id=${props.courseId}`)
    members.value = data || []
  } catch {
    members.value = []
  }
}

async function searchUsers() {
  const keyword = memberSearchKeyword.value.trim()
  if (!keyword) {
    searchResults.value = []
    return
  }
  try {
    const data = await cRequest<LmsSearchUser[]>(
      `/api/courses/members-search?courseId=${props.courseId}&keyword=${encodeURIComponent(keyword)}`,
    )
    searchResults.value = (data || []).filter((u) => {
      const m = members.value.find((m) => m.userId === u.id)
      return !m || !(m.isTeacher && m.isEditor)
    })
  } catch {
    searchResults.value = []
  }
}

async function addMember(userId: number, role: 'teacher' | 'editor') {
  memberUpdating.value = userId
  try {
    await cRequest('/api/courses/members', {
      method: 'POST',
      body: { courseId: props.courseId, userId, role, action: 'add' },
    })
    await loadMembers()
    searchResults.value = searchResults.value.filter((u) => {
      const m = members.value.find((m) => m.userId === u.id)
      return !m || !(m.isTeacher && m.isEditor)
    })
    toast.add({ title: t('courseEditor.memberAdded'), color: 'success' })
  } catch (e: any) {
    toast.add({ title: e.message || t('courseEditor.memberUpdateFailed'), color: 'error' })
  } finally {
    memberUpdating.value = null
  }
}

async function removeMember(userId: number, role: 'teacher' | 'editor') {
  memberUpdating.value = userId
  try {
    await cRequest('/api/courses/members', {
      method: 'POST',
      body: { courseId: props.courseId, userId, role, action: 'remove' },
    })
    await loadMembers()
    toast.add({ title: t('courseEditor.memberRemoved'), color: 'success' })
  } catch (e: any) {
    toast.add({ title: e.message || t('courseEditor.memberUpdateFailed'), color: 'error' })
  } finally {
    memberUpdating.value = null
  }
}

watch(memberSearchKeyword, () => searchUsers())

// 暴露给父组件调用
defineExpose({ loadMembers })
</script>
