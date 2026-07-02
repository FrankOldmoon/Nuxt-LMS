<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'sm:max-w-lg' }" scrollable>
    <template #content>
      <div class="p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold">{{ $t('profile.title') }}</h3>
        </div>

        <AuthUserProfileForm
          v-model="form"
          v-model:teaching-class-ids="teachingClassIds"
          v-model:teaching-course-ids="teachingCourseIds"
          v-model:editor-course-ids="editorCourseIds"
        />

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
            @click="saveProfile"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { UserProfileForm } from '#shared/types/lms'

const isOpen = defineModel<boolean>('open', { default: false })
const { user, refreshUser } = useAuth()
const toast = useToast()
const { t } = useI18n()

const saving = ref(false)

const teachingClassIds = ref<number[]>([])
const teachingCourseIds = ref<number[]>([])
const editorCourseIds = ref<number[]>([])

const form = ref<UserProfileForm>({
  name: '',
  preferName: '',
  englishName: '',
  email: '',
  gender: '',
  avatarImg: '',
  rollNumber: '',
  telephone: '',
  classId: null,
})

watch(isOpen, (val) => {
  if (val && user.value) {
    loadFormData()
  }
})

function loadFormData() {
  form.value = {
    name: user.value?.name || '',
    preferName: user.value?.preferName || '',
    englishName: user.value?.englishName || '',
    email: user.value?.email || '',
    gender: user.value?.gender || '',
    avatarImg: user.value?.avatarImg || '',
    rollNumber: user.value?.rollNumber || '',
    telephone: user.value?.telephone || '',
    classId: user.value?.classId ?? null,
  }
  loadTeachingData()
}

async function loadTeachingData() {
  try {
    const data = await cRequest<any>('/api/lms/users/teaching')
    teachingClassIds.value = data?.teachingClassIds || []
    teachingCourseIds.value = data?.teachingCourseIds || []
    editorCourseIds.value = data?.editorCourseIds || []
  } catch {
    teachingClassIds.value = []
    teachingCourseIds.value = []
    editorCourseIds.value = []
  }
}

function closeModal() {
  isOpen.value = false
}

async function saveProfile() {
  saving.value = true
  try {
    await cRequest('/api/auth/me', {
      method: 'PUT',
      body: form.value,
    })
    if (user.value) {
      await cRequest('/api/lms/users/teaching', {
        method: 'POST',
        body: {
          userId: user.value.id,
          teachingClassIds: teachingClassIds.value,
          teachingCourseIds: teachingCourseIds.value,
          editorCourseIds: editorCourseIds.value,
        },
      })
    }
    await refreshUser()
    isOpen.value = false
    toast.add({ title: t('profile.updateSuccess'), color: 'success' })
  } catch (e: any) {
    toast.add({ title: e.message || t('profile.updateFailed'), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>
