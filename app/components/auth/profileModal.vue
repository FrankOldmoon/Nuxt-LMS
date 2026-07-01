<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'sm:max-w-lg' }" scrollable>
    <template #content>
      <div class="p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold">{{ $t('profile.title') }}</h3>
        </div>

        <!-- 编辑模式（默认） -->
        <div class="space-y-4">
          <div class="flex justify-center mb-6">
            <UAvatar :src="form.avatarImg" :alt="form.name" size="2xl" :text="form.name?.charAt(0)" />
          </div>
          <UFormField :label="$t('profile.avatarImg')" class="w-full">
            <UInput v-model="form.avatarImg" :placeholder="$t('profile.avatarImgPlaceholder')" class="w-full" />
          </UFormField>
          <UFormField :label="$t('profile.name')" class="w-full">
            <UInput v-model="form.name" :placeholder="$t('profile.namePlaceholder')" class="w-full" />
          </UFormField>
          <UFormField :label="$t('profile.preferName')" class="w-full">
            <UInput v-model="form.preferName" :placeholder="$t('profile.preferNamePlaceholder')" class="w-full" />
          </UFormField>
          <UFormField :label="$t('profile.englishName')" class="w-full">
            <UInput v-model="form.englishName" :placeholder="$t('profile.englishNamePlaceholder')" class="w-full" />
          </UFormField>
          <UFormField :label="$t('profile.email')" class="w-full">
            <UInput v-model="form.email" type="email" :placeholder="$t('profile.emailPlaceholder')" class="w-full" />
          </UFormField>
          <UFormField :label="$t('profile.gender')" class="w-full">
            <USelect
              v-model="form.gender"
              :items="genderOptions"
              :placeholder="$t('profile.genderPlaceholder')"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="$t('profile.rollNumber')" class="w-full">
            <UInput v-model="form.rollNumber" :placeholder="$t('profile.rollNumberPlaceholder')" class="w-full" />
          </UFormField>
          <UFormField :label="$t('profile.telephone')" class="w-full">
            <UInput v-model="form.telephone" :placeholder="$t('profile.telephonePlaceholder')" class="w-full" />
          </UFormField>
          <UFormField :label="$t('profile.class')" class="w-full">
            <USelect
              v-model="form.classId"
              :items="classOptions"
              :placeholder="$t('profile.classPlaceholder')"
              class="w-full"
            />
          </UFormField>
          

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
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const isOpen = defineModel<boolean>('open', { default: false })
const { user, refreshUser } = useAuth()
const toast = useToast()
const { t } = useI18n()

const saving = ref(false)

const genderOptions = computed(() => [
  { label: t('profile.genderMale'), value: 'male' },
  { label: t('profile.genderFemale'), value: 'female' },
  { label: t('profile.genderOther'), value: 'other' },
])

const form = ref({
  name: '',
  preferName: '',
  englishName: '',
  email: '',
  gender: '',
  avatarImg: '',
  rollNumber: '',
  telephone: '',
  classId: null as number | null,
})

// 班级列表
interface ClassItem {
  id: number
  name: string
  code: string
}
const classes = ref<ClassItem[]>([])

const classOptions = computed(() => [
  { label: '', value: null },
  ...classes.value.map((c) => ({ label: c.name, value: c.id })),
])

async function loadClasses() {
  try {
    const data = await cRequest<ClassItem[]>('/api/lms/classes/list')
    classes.value = data || []
  } catch {
    classes.value = []
  }
}

// 弹窗打开时自动加载表单数据
watch(isOpen, (val) => {
  if (val && user.value) {
    loadFormData()
    loadClasses()
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
