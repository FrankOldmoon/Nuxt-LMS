<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'sm:max-w-lg' }" scrollable>
    <template #content>
      <div class="p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold">{{ $t('profile.title') }}</h3>
        </div>

        <AuthUserProfileForm v-model="form" />

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
interface UserProfileForm {
  name: string
  preferName: string
  englishName: string
  email: string
  gender: string
  avatarImg: string
  rollNumber: string
  telephone: string
  classId: number | null
}

const isOpen = defineModel<boolean>('open', { default: false })
const { user, refreshUser } = useAuth()
const toast = useToast()
const { t } = useI18n()

const saving = ref(false)

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
