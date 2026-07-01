<template>
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-lg' }">
    <UButton
      :label="$t('courseEditor.editCourse')"
      color="neutral"
      variant="ghost"
      size="sm"
      icon="i-lucide-settings"
      :disabled="!canEdit"
      @click.prevent.stop="openModal"
    />

    <template #content>
      <div class="p-6 max-h-[80vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold">{{ $t('courseEditor.title') }}</h3>
        </div>

        <div v-if="loading" class="flex items-center justify-center py-10 text-muted">
          <UIcon name="i-lucide-loader-2" class="animate-spin size-5 mr-2" />
          <span class="text-sm">{{ $t('courseEditor.loading') }}</span>
        </div>

        <div v-else class="space-y-4">
          <!-- 基础信息 -->
          <UFormField :label="$t('courseEditor.name')" class="w-full">
            <UInput v-model="form.name" :placeholder="$t('courseEditor.namePlaceholder')" class="w-full" />
          </UFormField>

          <UFormField :label="$t('courseEditor.code')" class="w-full">
            <UInput v-model="form.code" :placeholder="$t('courseEditor.codePlaceholder')" class="w-full" />
          </UFormField>

          <UFormField :label="$t('courseEditor.tags')" class="w-full">
            <UInputTags v-model="form.tags" :placeholder="$t('courseEditor.tagsPlaceholder')" class="w-full" />
          </UFormField>

          <USeparator :label="$t('courseEditor.configSection')" class="my-4" />

          <!-- config 中的图标 -->
          <UFormField :label="$t('courseEditor.icon')" class="w-full">
            <UInput v-model="config.icon" :placeholder="$t('courseEditor.iconPlaceholder')" class="w-full" />
          </UFormField>

          <!-- config 中的颜色 -->
          <UFormField :label="$t('courseEditor.color')" class="w-full">
            <USelect
              v-model="config.color"
              :items="colorOptions"
              class="w-full"
            />
          </UFormField>

          <!-- config 中的难度 -->
          <UFormField :label="$t('courseEditor.level')" class="w-full">
            <USelect
              v-model="config.level"
              :items="levelOptions"
              class="w-full"
            />
          </UFormField>

          <!-- config 开关项：show_announcement 等 -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium">{{ $t('courseEditor.showAnnouncement') }}</p>
                <p class="text-xs text-muted">{{ $t('courseEditor.showAnnouncementHint') }}</p>
              </div>
              <USwitch v-model="config.showAnnouncement" />
            </div>

            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium">{{ $t('courseEditor.showComments') }}</p>
                <p class="text-xs text-muted">{{ $t('courseEditor.showCommentsHint') }}</p>
              </div>
              <USwitch v-model="config.showComments" />
            </div>

            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium">{{ $t('courseEditor.showProgress') }}</p>
                <p class="text-xs text-muted">{{ $t('courseEditor.showProgressHint') }}</p>
              </div>
              <USwitch v-model="config.showProgress" />
            </div>
          </div>

          <!-- 教师/编辑者管理（仅管理员可见） -->
          <template v-if="hasRole('admin')">
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
              <!-- 搜索结果 -->
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
          </template>

          <!-- 自定义 config 参数（JSON） -->
          <UFormField :label="$t('courseEditor.extraConfig')" class="w-full">
            <UTextarea
              v-model="extraConfigText"
              :placeholder="$t('courseEditor.extraConfigPlaceholder')"
              :rows="3"
              class="w-full font-mono text-xs"
            />
            <p v-if="extraConfigError" class="text-xs text-error mt-1">{{ extraConfigError }}</p>
          </UFormField>

          <!-- 底部按钮 -->
          <div class="flex justify-end gap-2 pt-4">
            <UButton
              :label="$t('common.cancel')"
              color="neutral"
              variant="ghost"
              @click="closeModal"
            />
            <UButton
              :label="$t('common.save')"
              color="primary"
              :loading="saving"
              @click="save"
            />
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  courseId: number
}>()

const emit = defineEmits<{
  (e: 'saved'): void
}>()

const { t } = useI18n()
const toast = useToast()
const { hasRole, isCourseEditor } = useAuth()

const open = ref(false)
const loading = ref(false)
const saving = ref(false)

const canEdit = computed(() => hasRole('admin') || isCourseEditor(props.courseId))

const form = ref({
  name: '',
  code: '',
  tags: [] as string[],
})

// config 中已知字段的独立编辑（便于开关/下拉交互）
const config = reactive({
  icon: '',
  color: 'primary',
  level: '',
  showAnnouncement: true,
  showComments: true,
  showProgress: false,
})

// config 中未知字段的 JSON 文本编辑
const extraConfigText = ref('{}')
const extraConfigError = ref('')

const colorOptions = computed(() => [
  { label: t('courseEditor.colors.primary'), value: 'primary' },
  { label: t('courseEditor.colors.success'), value: 'success' },
  { label: t('courseEditor.colors.info'), value: 'info' },
  { label: t('courseEditor.colors.warning'), value: 'warning' },
  { label: t('courseEditor.colors.error'), value: 'error' },
  { label: t('courseEditor.colors.neutral'), value: 'neutral' },
])

const levelOptions = computed(() => [
  { label: t('home.levels.beginner'), value: t('home.levels.beginner') },
  { label: t('home.levels.intermediate'), value: t('home.levels.intermediate') },
  { label: t('home.levels.advanced'), value: t('home.levels.advanced') },
])

function openModal() {
  open.value = true
}

function closeModal() {
  open.value = false
}

/** 加载课程数据填充表单 */
async function loadCourse() {
  loading.value = true
  try {
    const data = await cRequest<any>(`/api/lms/courses/show?id=${props.courseId}`)
    form.value = {
      name: data?.title || '',
      code: data?.code || '',
      tags: (data?.tags as string[]) || [],
    }
    const cfg = (data?.config as Record<string, any>) || {}
    config.icon = cfg.icon || ''
    config.color = cfg.color || 'primary'
    config.level = cfg.level || t('home.levels.beginner')
    config.showAnnouncement = cfg.showAnnouncement ?? true
    config.showComments = cfg.showComments ?? true
    config.showProgress = cfg.showProgress ?? false

    // 收集已知字段之外的配置项，放入 extra JSON
    const knownKeys = ['icon', 'color', 'level', 'showAnnouncement', 'showComments', 'showProgress']
    const extra: Record<string, any> = {}
    for (const key of Object.keys(cfg)) {
      if (!knownKeys.includes(key)) {
        extra[key] = cfg[key]
      }
    }
    extraConfigText.value = JSON.stringify(extra, null, 2)
    extraConfigError.value = ''

    // 加载课程成员（教师/编辑者）
    await loadMembers()
  } catch {
    toast.add({ title: t('courseEditor.loadFailed'), color: 'error' })
  } finally {
    loading.value = false
  }
}

// ==================== 成员管理（教师/编辑者）====================

interface Member {
  userId: number
  username: string
  name: string
  avatarImg: string | null
  isTeacher: boolean
  isEditor: boolean
}

interface SearchUser {
  id: number
  username: string
  name: string
  avatarImg: string | null
}

const members = ref<Member[]>([])
const memberSearchKeyword = ref('')
const searchResults = ref<SearchUser[]>([])
const searching = ref(false)
const memberUpdating = ref<number | null>(null)

// 教师和编辑者分开列表
const teachers = computed(() => members.value.filter((m) => m.isTeacher))
const editors = computed(() => members.value.filter((m) => m.isEditor))

/** 判断用户是否已拥有指定角色 */
function isMemberRole(userId: number, role: 'teacher' | 'editor'): boolean {
  const m = members.value.find((m) => m.userId === userId)
  if (!m) return false
  return role === 'teacher' ? m.isTeacher : m.isEditor
}

async function loadMembers() {
  try {
    const data = await cRequest<Member[]>(`/api/lms/courses/members?id=${props.courseId}`)
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
  searching.value = true
  try {
    const data = await cRequest<SearchUser[]>(
      `/api/lms/courses/members-search?courseId=${props.courseId}&keyword=${encodeURIComponent(keyword)}`,
    )
    // 过滤掉已同时是教师和编辑者的用户（两种角色都有了就不需再添加）
    searchResults.value = (data || []).filter((u) => {
      const m = members.value.find((m) => m.userId === u.id)
      return !m || !(m.isTeacher && m.isEditor)
    })
  } catch {
    searchResults.value = []
  } finally {
    searching.value = false
  }
}

async function addMember(userId: number, role: 'teacher' | 'editor') {
  memberUpdating.value = userId
  try {
    await cRequest('/api/lms/courses/members', {
      method: 'POST',
      body: { courseId: props.courseId, userId, role, action: 'add' },
    })
    await loadMembers()
    // 重新过滤搜索结果（已添加的角色按钮会自动 disabled）
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
    await cRequest('/api/lms/courses/members', {
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

/** 合并 config 已知字段 + extra JSON，返回最终 config */
function buildConfig(): Record<string, any> | null {
  let extra: Record<string, any> = {}
  try {
    extra = JSON.parse(extraConfigText.value || '{}')
    extraConfigError.value = ''
  } catch {
    extraConfigError.value = t('settings.invalidJson')
    return null
  }
  return {
    icon: config.icon || undefined,
    color: config.color,
    level: config.level,
    showAnnouncement: config.showAnnouncement,
    showComments: config.showComments,
    showProgress: config.showProgress,
    ...extra,
  }
}

async function save() {
  const finalConfig = buildConfig()
  if (!finalConfig) return

  saving.value = true
  try {
    await cRequest('/api/lms/courses/update', {
      method: 'POST',
      body: {
        id: props.courseId,
        name: form.value.name,
        code: form.value.code,
        tags: form.value.tags,
        config: finalConfig,
      },
    })
    toast.add({ title: t('courseEditor.saveSuccess'), color: 'success' })
    emit('saved')
    closeModal()
  } catch (e: any) {
    toast.add({ title: e.message || t('courseEditor.saveFailed'), color: 'error' })
  } finally {
    saving.value = false
  }
}

watch(open, (val) => {
  if (val) loadCourse()
})
</script>
