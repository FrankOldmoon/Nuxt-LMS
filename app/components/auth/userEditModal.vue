<template>
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-lg' }" scrollable>
    <template #content>
      <div class="p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold">{{ $t('profile.title') }}</h3>
        </div>

        <div v-if="loading" class="flex items-center justify-center py-10 text-muted">
          <UIcon name="i-lucide-loader-2" class="animate-spin size-5 mr-2" />
          <span class="text-sm">{{ $t('profile.loading') }}</span>
        </div>

        <template v-else>
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
              @click="saveUser"
            />
          </div>
        </template>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { UserProfileForm } from '#shared/types/lms'

const props = defineProps<{
  userId: number | null
}>()

const emit = defineEmits<{
  (e: 'saved'): void
}>()

const { t } = useI18n()
const toast = useToast()

const open = ref(false)
const loading = ref(false)
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

async function loadUser() {
  if (!props.userId) return
  loading.value = true
  try {
    const data = await cRequest<any>(`/api/lms/users/show?id=${props.userId}`)
    form.value = {
      name: data?.name || '',
      preferName: data?.preferName || '',
      englishName: data?.englishName || '',
      email: data?.email || '',
      gender: data?.gender || '',
      avatarImg: data?.avatarImg || '',
      rollNumber: data?.rollNumber || '',
      telephone: data?.telephone || '',
      classId: data?.classId ?? null,
    }
  } catch {
    toast.add({ title: t('profile.loadFailed'), color: 'error' })
  } finally {
    loading.value = false
  }
}

function closeModal() {
  open.value = false
}

async function saveUser() {
  if (!props.userId) return
  saving.value = true
  try {
    await cRequest('/api/lms/users/update', {
      method: 'POST',
      body: { id: props.userId, ...form.value },
    })
    toast.add({ title: t('profile.updateSuccess'), color: 'success' })
    emit('saved')
    open.value = false
  } catch (e: any) {
    toast.add({ title: e.message || t('profile.updateFailed'), color: 'error' })
  } finally {
    saving.value = false
  }
}

function show() {
  open.value = true
}

watch(open, (val) => {
  if (val && props.userId) {
    loadUser()
  }
})

defineExpose({ show })
</script>
